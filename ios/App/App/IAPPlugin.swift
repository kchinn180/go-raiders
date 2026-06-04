import Foundation
import Capacitor
import StoreKit

/**
 * IAPPlugin - Native StoreKit 2 In-App Purchase Plugin for Capacitor
 *
 * Handles purchase and restore flows using StoreKit 2 APIs.
 * Products are verified via JWS (JSON Web Signature) tokens sent to the backend.
 */
@objc(IAPPlugin)
public class IAPPlugin: CAPPlugin {

    /// Long-running task that watches StoreKit's transaction update stream.
    /// Kept alive for the life of the plugin so we never miss a deferred
    /// purchase (Ask to Buy, parental approval, etc.) that completes after
    /// the original purchaseProduct() call returned `.pending`.
    private var updatesTask: Task<Void, Never>?

    // MARK: - Plugin Lifecycle

    /// Called by Capacitor when the plugin is registered with the bridge.
    /// Logging here confirms the plugin is wired up correctly — if you don't
    /// see "[IAPPlugin] load() called" in the Xcode console at app startup,
    /// the plugin isn't being registered and the JS side will hit the
    /// "'IAP' plugin is not implemented on ios" error.
    public override func load() {
        NSLog("[IAPPlugin] load() called — IAP plugin registered with Capacitor bridge")
        startTransactionUpdatesListener()
    }

    /// Spawns the background listener for `Transaction.updates`.
    ///
    /// StoreKit 2 delivers asynchronous transaction updates here when a
    /// purchase completes outside the original purchase call — e.g.:
    ///   - Ask to Buy approved by a family organizer hours later
    ///   - Strong Customer Authentication completed in a sandbox tester flow
    ///   - Subscription auto-renewal while the app is foregrounded
    ///   - A refund processed by Apple
    ///
    /// Without this listener, the user is charged but the app never finishes
    /// the transaction. StoreKit then re-delivers the same transaction every
    /// app launch, the user never sees their entitlement, and we accumulate
    /// support tickets. Apple explicitly calls this out as a required pattern.
    ///
    /// We emit a `transactionUpdate` Capacitor event so the JS layer can hit
    /// /api/subscription/verify with the JWS and refresh the user's premium
    /// state from the server.
    private func startTransactionUpdatesListener() {
        updatesTask = Task.detached(priority: .background) { [weak self] in
            for await result in Transaction.updates {
                guard let self else { return }
                NSLog("[IAPPlugin] Transaction.updates fired")
                switch result {
                case .verified(let transaction):
                    // Notify JS so it can verify with the backend.
                    self.notifyListeners("transactionUpdate", data: [
                        "transactionId": String(transaction.id),
                        "productId": transaction.productID,
                        "jwsRepresentation": result.jwsRepresentation,
                    ])
                    // ALWAYS finish, even before backend verification —
                    // otherwise the same transaction redelivers on every
                    // launch. Backend verification is idempotent on the
                    // JWS, so a redelivered txn is the worse failure mode.
                    await transaction.finish()
                    NSLog("[IAPPlugin] finished transaction \(transaction.id) for \(transaction.productID)")

                case .unverified(let transaction, let error):
                    NSLog("[IAPPlugin] Unverified transaction \(transaction.id): \(error.localizedDescription)")
                    // Still finish so it doesn't redeliver forever.
                    await transaction.finish()
                }
            }
        }
    }

    deinit {
        updatesTask?.cancel()
    }

    // MARK: - Purchase a Product

    @objc func purchaseProduct(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId") else {
            call.reject("Missing productId")
            return
        }

        NSLog("[IAPPlugin] purchaseProduct invoked for productId=\(productId)")

        Task {
            do {
                // Fetch the product from the App Store (or the .storekit config in simulator)
                let products = try await Product.products(for: [productId])

                guard let product = products.first else {
                    // This is the most common review-time failure: the product ID
                    // either isn't configured in App Store Connect, isn't in
                    // "Ready to Submit" status, or the Paid Apps Agreement
                    // hasn't been signed. In the simulator, this means the
                    // .storekit configuration file isn't selected in the scheme.
                    call.reject(
                        "Product not found: \(productId). " +
                        "In simulator: check the StoreKit Configuration is selected in the scheme. " +
                        "On device: check the product is configured in App Store Connect " +
                        "and the Paid Apps Agreement is signed."
                    )
                    return
                }

                // Begin the purchase flow (shows native App Store sheet)
                let result = try await product.purchase()

                switch result {
                case .success(let verification):
                    // jwsRepresentation is on the VerificationResult, not on Transaction
                    let jwsToken = verification.jwsRepresentation
                    switch verification {
                    case .verified(let transaction):
                        // Finish the transaction so it doesn't reappear
                        await transaction.finish()

                        call.resolve([
                            "success": true,
                            "cancelled": false,
                            "pending": false,
                            "transactionId": String(transaction.id),
                            "productId": transaction.productID,
                            "jwsRepresentation": jwsToken
                        ])

                    case .unverified(_, let error):
                        call.reject("Transaction unverified: \(error.localizedDescription)")
                    }

                case .userCancelled:
                    call.resolve([
                        "success": false,
                        "cancelled": true,
                        "pending": false
                    ])

                case .pending:
                    // Awaiting approval (e.g. Ask to Buy)
                    call.resolve([
                        "success": false,
                        "cancelled": false,
                        "pending": true
                    ])

                @unknown default:
                    call.reject("Unknown purchase result")
                }

            } catch {
                call.reject("Purchase error: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Fetch Product Info (prices, display names)

    /// Returns StoreKit product details for the given product IDs.
    /// Used by the JS layer to display locale-correct prices before the user taps "Buy".
    @objc func getProducts(_ call: CAPPluginCall) {
        guard let productIds = call.getArray("productIds", String.self), !productIds.isEmpty else {
            call.reject("Missing or empty productIds array")
            return
        }

        Task {
            do {
                let products = try await Product.products(for: Set(productIds))

                let result: [[String: Any]] = products.map { product in
                    var item: [String: Any] = [
                        "productId": product.id,
                        "displayName": product.displayName,
                        "description": product.description,
                        "price": Double(truncating: product.price as NSDecimalNumber),
                        "localizedPrice": product.displayPrice,
                        "displayPrice": product.displayPrice,
                    ]
                    // Include subscription period info if applicable.
                    // `unit` is a StoreKit struct, not a Swift enum — `debugDescription`
                    // is not a stable string API, so switch explicitly.
                    if let subscription = product.subscription {
                        let unitString: String
                        switch subscription.subscriptionPeriod.unit {
                        case .day: unitString = "day"
                        case .week: unitString = "week"
                        case .month: unitString = "month"
                        case .year: unitString = "year"
                        @unknown default: unitString = "unknown"
                        }
                        item["subscriptionPeriod"] = unitString
                        item["subscriptionPeriodValue"] = subscription.subscriptionPeriod.value
                    }
                    return item
                }

                call.resolve(["products": result])
            } catch {
                call.reject("getProducts error: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Restore Purchases

    @objc func restorePurchases(_ call: CAPPluginCall) {
        Task {
            var jwsTokens: [[String: Any]] = []

            // Iterate all current entitlements (non-expired)
            for await result in Transaction.currentEntitlements {
                if case .verified(let transaction) = result {
                    jwsTokens.append([
                        "transactionId": String(transaction.id),
                        "productId": transaction.productID,
                        "jwsRepresentation": result.jwsRepresentation
                    ])
                }
            }

            call.resolve([
                "success": true,
                "transactions": jwsTokens
            ])
        }
    }
}
