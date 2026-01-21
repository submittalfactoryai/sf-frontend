import React from "react";
import { Link } from "react-router-dom";
import {
  FileText, Search, CheckCircle2, Layers, Boxes, Settings, Upload,
  ClipboardList, Package, ArrowRight, Building2, Hammer, Ruler, Quote
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-blue-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 text-white grid place-items-center font-bold shadow-sm">
              SF
            </div>
            <div className="leading-tight">
              <div className="text-lg font-bold text-neutral-900">
                Submittal Factory
              </div>
              <div className="text-xs text-neutral-500">Smarter Submittals</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a
              href="#features"
              className="text-neutral-700 hover:text-blue-700"
            >
              Features
            </a>
            <a
              href="#workflow"
              className="text-neutral-700 hover:text-blue-700"
            >
              Workflow
            </a>
            <a
              href="#audience"
              className="text-neutral-700 hover:text-blue-700"
            >
              Who it's for
            </a>
            {/* <a href="#testimonials" className="text-neutral-700 hover:text-blue-700">Testimonials</a> */}
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-secondary">
              Sign in
            </Link>
            <Link to="/register" className="btn-accent hidden sm:inline-flex">
              <ArrowRight className="w-4 h-4" />
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-neutral-900 mb-4">
                Smarter Submittals. Built for Construction.
              </h1>
              <p className="text-xl text-blue-700 font-semibold mb-3">
                Built by Builders. For Builders.
              </p>
              <p className="text-neutral-700 leading-relaxed mb-8">
                Submittal Factory was designed by industry professionals who
                have lived through the submittal process from all vantage
                points. We created this platform to give trade contractors,
                general contractors, and design teams a fast and reliable way to
                extract, package, and submit construction submittals—accurately,
                and on time.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link to="/register" className="btn-accent">
                  Start Free Trial
                </Link>
                <a
                  href="mailto:zack@kbccm.com?subject=Schedule%20a%20Demo"
                  className="btn-primary"
                >
                  Schedule a Demo
                </a>
                <a href="mailto:zack@kbccm.com" className="btn-secondary">
                  Contact Us
                </a>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-blue-50 p-4 border border-blue-100">
                  <Upload className="w-6 h-6 text-blue-600 mb-2" />
                  <div className="font-semibold text-neutral-900">
                    Upload Specs
                  </div>
                  <div className="text-sm text-neutral-600">
                    PDF sections from your project manual
                  </div>
                </div>
                <div className="rounded-xl bg-emerald-50 p-4 border border-emerald-100">
                  <Search className="w-6 h-6 text-emerald-700 mb-2" />
                  <div className="font-semibold text-neutral-900">
                    Auto-Extract
                  </div>
                  <div className="text-sm text-neutral-600">
                    Submittals & products detected
                  </div>
                </div>
                <div className="rounded-xl bg-amber-50 p-4 border border-amber-100">
                  <FileText className="w-6 h-6 text-amber-700 mb-2" />
                  <div className="font-semibold text-neutral-900">
                    Gather PDS/MSDS
                  </div>
                  <div className="text-sm text-neutral-600">
                    Our construction search engine
                  </div>
                </div>
                <div className="rounded-xl bg-violet-50 p-4 border border-violet-100">
                  <CheckCircle2 className="w-6 h-6 text-violet-700 mb-2" />
                  <div className="font-semibold text-neutral-900">Validate</div>
                  <div className="text-sm text-neutral-600">
                    Compliance vs. project spec
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What it does */}
      <section
        id="features"
        className="py-14 md:py-20 bg-white border-t border-neutral-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-6">
            What Submittal Factory Does
          </h2>
          <p className="text-neutral-700 mb-8 max-w-3xl">
            Submittal Factory allows users to directly upload a specific
            Specification Section of a construction project to create a list of
            all of the required submittals as well as each product required for
            the project.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Layers,
                title: "Identify Deliverables",
                desc: "Identify all required deliverables",
              },
              {
                icon: Boxes,
                title: "Extract Products",
                desc: "Identify all products required by the Spec.",
              },
              {
                icon: Search,
                title: "Find Documents",
                desc: "Automatically search out Product Data, Installation Instructions, MSDS, Material Certs through our custom built construction search engine.",
              },
              {
                icon: Settings,
                title: "Spec Validation",
                desc: "Select the products desired and have the system compare it against the Project Specification to ensure compliance.",
              },
              {
                icon: ClipboardList,
                title: "Validation Report",
                desc: "Provide your downstream customer whether it is a General Contractor, Architect, or Owner with a tailored made validation report that summarizes compliance with the specifications.",
              },
              {
                icon: Package,
                title: "Submittal Register",
                desc: "Generate a tailored submittal register in minutes (future feature)",
              },
            ].map((f, i) => (
              <div
                key={i}
                className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
              >
                <f.icon className="w-6 h-6 text-blue-600 mb-3" />
                <div className="font-semibold text-neutral-900 mb-1">
                  {f.title}
                </div>
                <div className="text-sm text-neutral-600">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="py-14 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-8">
            Sample Workflow
          </h2>
          <ol className="grid md:grid-cols-5 gap-5">
            {[
              {
                icon: Upload,
                title: "Upload Specs",
                desc: "Drag & drop PDF sections from your project manual.",
              },
              {
                icon: Ruler,
                title: "Select Division or Trade",
                desc: "Focus on only what's relevant—Division 9, HVAC, Electrical, etc.",
              },
              {
                icon: Search,
                title: "Extract Submittals Automatically",
                desc: "Our engine reviews the specs and outputs a complete list of required submittals and documentation.",
              },
              {
                icon: FileText,
                title: "Bundle Deliverables",
                desc: "Optionally, attach product data, photos, and other assets.",
              },
              {
                icon: ArrowRight,
                title: "Export or Connect",
                desc: "Export to PDF, Excel, or Connect to Your Platform — Use our built-in exports or integrate with Procore or e-Builder (coming soon).",
              },
            ].map((s, i) => (
              <li
                key={i}
                className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
              >
                <s.icon className="w-6 h-6 text-blue-600 mb-2" />
                <div className="font-semibold">
                  {i + 1}. {s.title}
                </div>
                <div className="text-sm text-neutral-600">{s.desc}</div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Audience */}
      <section
        id="audience"
        className="py-14 md:py-20 bg-white border-y border-neutral-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-8">
            Who It's For
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Hammer,
                title: "Trade Contractors",
                desc: "Find Spec compliant products from a greater variety of sources.",
              },
              {
                icon: Building2,
                title: "General Contractors",
                desc: "Reduce time chasing submittals and improve package quality. Lower risk exposure to the project by having a validated submittal for all required reviewers.",
              },
              {
                icon: Ruler,
                title: "Design Professionals",
                desc: "Ensure that product and installation information is verified before construction starts.",
              },
            ].map((c, i) => (
              <div
                key={i}
                className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
              >
                <c.icon className="w-6 h-6 text-blue-600 mb-3" />
                <div className="font-semibold text-neutral-900 mb-1">
                  {c.title}
                </div>
                <div className="text-sm text-neutral-600">{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="py-14 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-6">
            Why Use Submittal Factory?
          </h2>
          <ul className="grid md:grid-cols-2 gap-3 text-neutral-800">
            {[
              "✓ Saves hours of manual review",
              "✓ Reduces RFIs and submittal rejections",
              "✓ Custom-built for construction workflows",
              "✓ Clear interface with zero fluff",
              "✓ Works across all CSI divisions",
            ].map((t, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
                <span>{t.replace("✓", "").trim()}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Testimonials */}
      {/* <section id="testimonials" className="py-14 md:py-20 bg-white border-t border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-8">What Our Users Say</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { quote: "Cut our submittal prep from days to hours.", author: "PM, Electrical GC" },
              { quote: "Validation report made approvals painless.", author: "Senior Architect" },
              { quote: "Finally a tool built for how we work.", author: "Submittal Manager" },
            ].map((t, i) => (
              <figure key={i} className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                <Quote className="w-6 h-6 text-blue-600 mb-3" />
                <blockquote className="text-neutral-800 mb-3">"{t.quote}"</blockquote>
                <figcaption className="text-sm text-neutral-500">— {t.author}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section> */}

      {/* Call to action */}
      <section className="py-12 md:py-16">
        <div className="max-w-3xl mx-auto text-center px-4">
          <h3 className="text-2xl font-bold text-neutral-900 mb-2">
            Ready to Work Smarter?
          </h3>
          <p className="text-neutral-600 mb-6">
            Join contractors across the country streamlining their submittal
            process.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/register" className="btn-accent">
              Start Free Trial
            </Link>
            <a
              href="mailto:zack@kbccm.com?subject=Schedule%20a%20Demo"
              className="btn-primary"
            >
              Schedule a Demo
            </a>
            <a href="mailto:zack@kbccm.com" className="btn-secondary">
              Contact Us
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-neutral-900 text-neutral-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="text-white font-semibold mb-2">
                Submittal Factory
              </div>
              <p className="text-sm text-neutral-400">
                Smarter Submittals. Built for Construction.
              </p>
            </div>
            <div>
              <div className="text-white font-semibold mb-2">Product</div>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#features" className="hover:text-white">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#workflow" className="hover:text-white">
                    Workflow
                  </a>
                </li>
                <li>
                  <a href="#audience" className="hover:text-white">
                    Who it's for
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <div className="text-white font-semibold mb-2">Company</div>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/login" className="hover:text-white">
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="hover:text-white">
                    Start free trial
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <div className="text-white font-semibold mb-2">Contact</div>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="mailto:zack@kbccm.com" className="hover:text-white">
                    zack@kbccm.com
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-neutral-800 pt-6 text-xs text-neutral-500">
            © {new Date().getFullYear()} Submittal Factory. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}