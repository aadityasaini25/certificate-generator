import { APP } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>
          &copy; {new Date().getFullYear()} {APP.name}. All rights reserved.
        </p>
        <p>
          Need help?{" "}
          <a
            href={`mailto:${APP.supportEmail}`}
            className="font-medium text-brand-700 underline-offset-4 hover:underline"
          >
            {APP.supportEmail}
          </a>
        </p>
      </div>
    </footer>
  );
}
