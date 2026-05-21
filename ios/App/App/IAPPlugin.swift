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

    // MARK: - Purchase a Product

    @objc func purchaseProduct(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId") else {
            call.reject("Missing productId")
            return
        }

        Task {
            do {
                // Fetch the product from the App Store
                let products = try await Product.products(for: [productId])

                guard let product = products.first else {
                    call.reject("Product not found: \(productId)")
                    return
                }

                // Begin the purchase flow (shows native App Store sheet)
                let result = try await product.purchase()

                switch result {
                case .success(let verification):
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
                            "jwsRepresentation": transaction.jwsRepresentation
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
                        "jwsRepresentation": transaction.jwsRepresentation
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
