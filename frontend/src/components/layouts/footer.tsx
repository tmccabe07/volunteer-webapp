/**
 * Footer Component
 * 
 * Site footer with pack information and links
 */

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-background">
      <div className="container flex flex-col items-center justify-between gap-4 py-6 md:h-16 md:flex-row md:py-0">
        <div className="text-center text-sm leading-loose text-muted-foreground md:text-left">
          © {currentYear} Cub Scout Pack Volunteer Management System
        </div>
        
        <div className="flex items-center space-x-4">
          <a
            href="/help"
            className="text-sm text-muted-foreground hover:text-primary"
          >
            Help
          </a>
          <a
            href="/privacy"
            className="text-sm text-muted-foreground hover:text-primary"
          >
            Privacy
          </a>
          <a
            href="/terms"
            className="text-sm text-muted-foreground hover:text-primary"
          >
            Terms
          </a>
        </div>
      </div>
    </footer>
  );
}
