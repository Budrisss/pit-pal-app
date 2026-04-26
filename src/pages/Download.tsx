import { Link } from "react-router-dom";
import { Apple, Monitor, Laptop, Smartphone, Download as DownloadIcon, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import tracksideLogo from "@/assets/trackside-logo-v2.png";

type Platform = {
  id: string;
  name: string;
  icon: typeof Apple;
  file: string;
  size: string;
  steps: string[];
};

const platforms: Platform[] = [
  {
    id: "mac",
    name: "macOS",
    icon: Apple,
    file: "/downloads/TrackSideOps-mac.zip",
    size: ".zip · Intel & Apple Silicon",
    steps: [
      "Download and unzip the file",
      "Drag Track Side Ops to your Applications folder",
      "First launch: right-click the app → Open (one-time security prompt)",
    ],
  },
  {
    id: "windows",
    name: "Windows",
    icon: Monitor,
    file: "/downloads/TrackSideOps-windows.zip",
    size: ".zip · Windows 10 & 11",
    steps: [
      "Download and unzip the file",
      "Move the folder anywhere (e.g. Program Files)",
      'Run "Track Side Ops.exe" — click "More info → Run anyway" if SmartScreen warns',
    ],
  },
  {
    id: "linux",
    name: "Linux",
    icon: Laptop,
    file: "/downloads/TrackSideOps-linux.tar.gz",
    size: ".tar.gz · x64",
    steps: [
      "Download and extract: tar xzf TrackSideOps-linux.tar.gz",
      'Run ./"Track Side Ops" from the extracted folder',
      "Optionally create a .desktop launcher",
    ],
  },
];

const Download = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 h-full py-2">
            <img src={tracksideLogo} alt="Track Side Ops" className="h-full w-auto object-contain invert" />
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/"><ChevronLeft size={16} className="mr-1" /> Back</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-5 sm:px-6 pt-12 sm:pt-20 pb-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary mb-5">
            <DownloadIcon size={14} /> Desktop Apps
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Get Track Side Ops on your <span className="text-primary">desktop</span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            The same Track Side Ops, in its own native window. Always up to date — every web release flows through automatically, no reinstalling.
          </p>
        </motion.div>
      </section>

      {/* Platform cards */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {platforms.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-card border border-border rounded-xl p-6 flex flex-col hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <p.icon size={24} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold leading-tight">{p.name}</h2>
                  <p className="text-xs text-muted-foreground">{p.size}</p>
                </div>
              </div>
              <Button asChild className="w-full mb-4">
                <a href={p.file} download>
                  <DownloadIcon size={16} className="mr-1" /> Download for {p.name}
                </a>
              </Button>
              <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside flex-1">
                {p.steps.map((s) => <li key={s}>{s}</li>)}
              </ol>
            </motion.div>
          ))}
        </div>

        {/* Mobile placeholder */}
        <div className="mt-10 bg-card/50 border border-dashed border-border rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Smartphone size={24} className="text-muted-foreground" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-semibold">iOS &amp; Android</h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-primary/15 text-primary">Coming soon</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Native mobile apps are on the way. In the meantime, open <span className="text-foreground font-medium">tracksideops.com</span> on your phone — it works great as a mobile web app.
            </p>
          </div>
        </div>

        {/* Use in browser */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">Don't want to install?</p>
          <Button variant="outline" asChild>
            <Link to="/dashboard">Open in browser instead</Link>
          </Button>
        </div>
      </section>

      {/* How updates work */}
      <section className="border-t border-border bg-card/30">
        <div className="max-w-3xl mx-auto px-5 sm:px-6 py-12 sm:py-16">
          <h2 className="text-xl sm:text-2xl font-bold mb-3 text-center">Always up to date</h2>
          <p className="text-sm sm:text-base text-muted-foreground text-center max-w-xl mx-auto">
            The desktop app loads tracksideops.com inside a native window. When we ship a new feature or fix a bug, it appears in your desktop app the next time you open it — no re-downloading, no app store updates, no waiting.
          </p>
        </div>
      </section>

      <footer className="border-t border-border py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Track Side. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Download;