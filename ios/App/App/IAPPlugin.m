#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Register the IAPPlugin with Capacitor's bridge
CAP_PLUGIN(IAPPlugin, "IAP",
    CAP_PLUGIN_METHOD(purchaseProduct, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(restorePurchases, CAPPluginReturnPromise);
)
