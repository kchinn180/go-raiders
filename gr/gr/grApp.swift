//
//  grApp.swift
//  gr
//
//  Created by Kyree Chinn on 4/15/26.
//

import SwiftUI
import CoreData

@main
struct grApp: App {
    let persistenceController = PersistenceController.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(\.managedObjectContext, persistenceController.container.viewContext)
        }
    }
}
