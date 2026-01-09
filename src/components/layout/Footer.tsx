export function Footer() {
  return (
    <footer className="bg-bg-secondary border-t border-border-subtle py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Brand */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
              </svg>
            </div>
            <div>
              <span className="font-display text-lg text-text-primary">Auction</span>
              <p className="text-text-muted text-sm">Curated digital art on Solana</p>
            </div>
          </div>

          {/* Links & Network */}
          <div className="flex items-center gap-8 text-sm">
            <a href="#" className="text-text-muted hover:text-accent transition-colors font-medium">
              Terms
            </a>
            <a href="#" className="text-text-muted hover:text-accent transition-colors font-medium">
              Privacy
            </a>
            <a href="#" className="text-text-muted hover:text-accent transition-colors font-medium">
              FAQ
            </a>
            <div className="flex items-center gap-2 px-4 py-2 bg-olive-muted rounded-button">
              <span className="w-2 h-2 rounded-full bg-olive animate-pulse" />
              <span className="text-olive font-semibold">Devnet</span>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-border-subtle text-center">
          <p className="text-text-muted text-sm">
            &copy; {new Date().getFullYear()} Auction. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
