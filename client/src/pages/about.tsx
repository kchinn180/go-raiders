import { ArrowLeft, Flame, Users, Zap, Shield, Crown, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import logoImage from "@assets/IMG_0027_1768190905765.png";

interface AboutPageProps {
  onBack: () => void;
}

export function AboutPage({ onBack }: AboutPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card border-b border-card-border p-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold">About GO Raiders</h1>
      </header>

      <div className="p-6 space-y-6 max-w-2xl mx-auto">
        {/* Hero Section */}
        <div className="text-center py-8">
          <div className="w-24 h-24 rounded-3xl mx-auto mb-4 overflow-hidden ring-4 ring-orange-600/30 shadow-xl">
            <img src={logoImage} alt="GO Raiders Logo" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-3xl font-black mb-2">GO Raiders</h2>
          <p className="text-muted-foreground">The #1 Raid Coordination Tool</p>
          <p className="text-sm text-muted-foreground mt-2">Version 1.0.0</p>
        </div>

        {/* Mission */}
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            Our Mission
          </h3>
          <p className="text-muted-foreground">
            GO Raiders was created to help Pokémon GO trainers around the world connect and coordinate for raid battles. We believe that every trainer should have access to legendary Pokémon, regardless of their local community size.
          </p>
        </Card>

        {/* Features */}
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4">Features</h3>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="font-semibold">Find Raids</p>
                <p className="text-sm text-muted-foreground">Browse active raid lobbies and join with one tap</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="font-semibold">Host Raids</p>
                <p className="text-sm text-muted-foreground">Create lobbies and invite trainers worldwide</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="font-semibold">Team Support</p>
                <p className="text-sm text-muted-foreground">Represent Valor, Mystic, or Instinct with pride</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Crown className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="font-semibold">Elite Benefits</p>
                <p className="text-sm text-muted-foreground">Auto Join, priority queues, and more for subscribers</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Community
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-black text-primary">10K+</p>
              <p className="text-xs text-muted-foreground">Trainers</p>
            </div>
            <div>
              <p className="text-2xl font-black text-primary">50K+</p>
              <p className="text-xs text-muted-foreground">Raids Hosted</p>
            </div>
            <div>
              <p className="text-2xl font-black text-primary">4.8</p>
              <p className="text-xs text-muted-foreground">App Rating</p>
            </div>
          </div>
        </Card>

        {/* Legal Disclaimer */}
        <div className="p-4 bg-muted/50 rounded-xl">
          <p className="text-xs text-muted-foreground text-center">
            GO Raiders is an independent third-party application. It is not affiliated with, endorsed by, or connected to Niantic, The Pokémon Company, or Nintendo. Pokémon and all related names, images, and trademarks are the property of their respective owners.
          </p>
        </div>

        {/* Copyright */}
        <p className="text-center text-xs text-muted-foreground pb-8">
          © 2025 GO Raiders. All rights reserved.
        </p>
      </div>
    </div>
  );
}
