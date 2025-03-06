"use client";

import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Sparkles, Lightbulb, Users, Palette, Cloud, Zap, Share2 } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card3D, CardItem } from "@/components/aceternity/3d-card";
import { BentoGrid, BentoGridItem } from "@/components/aceternity/bento-grid";
import { Spotlight } from "@/components/aceternity/spotlight";
import { TextReveal } from "@/components/aceternity/text-reveal";
import { WavyBackground } from "@/components/aceternity/wavy-background";
import { GlowingStarsBackground } from "@/components/aceternity/glowing-stars";
import { MovingBorder } from "@/components/aceternity/moving-border";
import { HeroSection } from "@/components/hero-section";

export default function LandingPage() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push('/dashboard');
    }
  }, [session, router]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <HeroSection />

      {/* 3D Card Feature Section */}
      <section className="container mx-auto px-4 py-12 md:py-24">
        <div className="text-center mb-8 md:mb-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Experience the Future of Digital Whiteboards</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            CanvaSync combines powerful tools with an intuitive interface to transform how you collaborate and create.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-center">
          <div className="h-[400px] md:h-[450px] w-full relative">
            <Card3D containerClassName="w-full h-full">
              <div className="w-full h-full rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-6 md:p-8 text-white relative">
                <CardItem
                  translateZ={50}
                  className="text-2xl md:text-3xl font-bold mb-4 relative w-full"
                >
                  Unleash Your Creativity
                </CardItem>

                <CardItem
                  translateZ={60}
                  className="text-base md:text-lg mb-6 md:mb-8 relative w-full"
                >
                  Our infinite canvas gives you the freedom to express your ideas without constraints.
                </CardItem>

                <CardItem
                  translateZ={80}
                  className="w-full h-32 md:h-40 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center relative"
                >
                  <Palette className="h-12 w-12 md:h-16 md:w-16 text-white" />
                </CardItem>

                <CardItem
                  translateZ={30}
                  className="text-sm mt-6 md:mt-8 relative w-full"
                >
                  Powerful drawing tools, smart shapes, and intuitive controls make creation effortless.
                </CardItem>
              </div>
            </Card3D>
          </div>

          <div className="h-[400px] md:h-[450px] w-full relative">
            <Card3D containerClassName="w-full h-full">
              <div className="w-full h-full rounded-2xl bg-gradient-to-br from-pink-500 to-orange-500 p-6 md:p-8 text-white relative">
                <CardItem
                  translateZ={50}
                  className="text-2xl md:text-3xl font-bold mb-4 relative w-full"
                >
                  Collaborate in Real-Time
                </CardItem>

                <CardItem
                  translateZ={60}
                  className="text-base md:text-lg mb-6 md:mb-8 relative w-full"
                >
                  Work together with your team no matter where they are located.
                </CardItem>

                <CardItem
                  translateZ={80}
                  className="w-full h-32 md:h-40 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center relative"
                >
                  <Users className="h-12 w-12 md:h-16 md:w-16 text-white" />
                </CardItem>

                <CardItem
                  translateZ={30}
                  className="text-sm mt-6 md:mt-8 relative w-full"
                >
                  Multiple users can edit, comment, and interact simultaneously with zero lag.
                </CardItem>
              </div>
            </Card3D>
          </div>
        </div>
      </section>

      {/* Features Bento Grid Section */}
      <Spotlight className="py-24 bg-neutral-950">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 text-white">Powerful Features</h2>
            <p className="text-neutral-300 max-w-2xl mx-auto">
              Everything you need to bring your ideas to life and collaborate effectively.
            </p>
          </div>

          <BentoGrid className="max-w-6xl mx-auto">
            {features.map((feature, i) => (
              <BentoGridItem
                key={i}
                title={feature.title}
                description={feature.description}
                icon={feature.icon}
                delay={i * 0.1}
                className={i === 0 || i === 3 ? "md:col-span-2" : ""}
              />
            ))}
          </BentoGrid>
        </div>
      </Spotlight>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-[1px]"
        >
          <div className="bg-background rounded-2xl p-8 md:p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Collaboration?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
              Join thousands of teams already using CanvaSync to bring their ideas to life.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
              >
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-6 py-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                Try Demo
              </Link>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}

const features = [
  {
    title: "Infinite Canvas",
    description: "Unlimited space to express your ideas without constraints.",
    icon: <Lightbulb className="h-6 w-6 text-primary" />,
  },
  {
    title: "Real-time Collaboration",
    description: "Work together with your team in real-time, seeing changes instantly.",
    icon: <Users className="h-6 w-6 text-primary" />,
  },
  {
    title: "Smart Drawing Tools",
    description: "Intelligent tools that adapt to your style and needs.",
    icon: <Palette className="h-6 w-6 text-primary" />,
  },
  {
    title: "Cloud Sync",
    description: "Your work is automatically saved and accessible from any device, anytime, anywhere.",
    icon: <Cloud className="h-6 w-6 text-primary" />,
  },
  {
    title: "Instant Sharing",
    description: "Share your boards with anyone via a simple link.",
    icon: <Share2 className="h-6 w-6 text-primary" />,
  },
  {
    title: "Performance Optimized",
    description: "Smooth experience even with complex diagrams and multiple users.",
    icon: <Zap className="h-6 w-6 text-primary" />,
  },
];

