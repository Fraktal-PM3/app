"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ChevronRight, Home, LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useMemo } from "react";

export interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  /**
   * Main page title
   */
  title: string;

  /**
   * Optional subtitle/description displayed below the title
   */
  subtitle?: string;

  /**
   * Optional icon to display next to the title
   */
  icon?: LucideIcon;

  /**
   * Whether to show breadcrumbs (default: true)
   * Breadcrumbs are automatically generated from the URL path
   */
  showBreadcrumbs?: boolean;

  /**
   * Whether to show back button (auto-enabled for paths deeper than 1 level)
   * Can be explicitly set to false to disable
   */
  showBackButton?: boolean;

  /**
   * Optional custom back button href (defaults to previous breadcrumb or router.back())
   */
  backButtonHref?: string;

  /**
   * Optional custom back button label (defaults to "Back")
   */
  backButtonLabel?: string;

  /**
   * Optional custom breadcrumbs to override auto-generated ones
   * Example: [{ label: "Home", href: "/" }, { label: "Packages" }]
   */
  customBreadcrumbs?: Breadcrumb[];

  /**
   * Optional custom labels for breadcrumb segments
   * Maps path segments to human-readable labels
   * Example: { "packages": "My Packages", "offers": "Available Offers" }
   */
  breadcrumbLabels?: Record<string, string>;

  /**
   * Optional content to inject on the right side of the header
   * Typically used for status indicators, badges, buttons, or toggles
   */
  rightContent?: ReactNode;

  /**
   * Optional className for additional styling
   */
  className?: string;

  /**
   * Whether to show animation on mount (default: true)
   */
  animated?: boolean;
}

/**
 * Capitalizes first letter and replaces hyphens with spaces
 */
function formatSegment(segment: string): string {
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * PageHeader - Reusable header component for all pages
 *
 * Provides consistent header styling across the application with support for:
 * - Title and optional subtitle
 * - Optional icon
 * - Auto-generated breadcrumb navigation from URL path
 * - Customizable right-side content injection (badges, indicators, buttons, etc.)
 * - Responsive layout (stacks on mobile, side-by-side on desktop)
 * - Optional framer-motion animations
 *
 * @example
 * ```tsx
 * // Simple header with auto-generated breadcrumbs
 * <PageHeader title="Dashboard" />
 *
 * // Header with subtitle and icon (breadcrumbs auto-generated)
 * <PageHeader
 *   title="Package Details"
 *   subtitle="View and manage package information"
 *   icon={PackageIcon}
 * />
 *
 * // Header with custom breadcrumb labels
 * <PageHeader
 *   title="My Packages"
 *   breadcrumbLabels={{
 *     packages: "My Packages",
 *     offers: "Available Offers"
 *   }}
 * />
 *
 * // Header without breadcrumbs
 * <PageHeader
 *   title="Dashboard"
 *   showBreadcrumbs={false}
 * />
 *
 * // Header with right-side content injection
 * <PageHeader
 *   title="Available Offers"
 *   subtitle="Browse package delivery opportunities"
 *   icon={Briefcase}
 *   rightContent={
 *     <>
 *       <Badge variant="outline">{count} Available</Badge>
 *       <RealtimeIndicator isConnected={isConnected} />
 *     </>
 *   }
 * />
 * ```
 */
export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  showBreadcrumbs = true,
  showBackButton,
  backButtonHref,
  backButtonLabel = "Back",
  customBreadcrumbs,
  breadcrumbLabels = {},
  rightContent,
  className = "",
  animated = true,
}: PageHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Auto-generate breadcrumbs from pathname
  const breadcrumbs = useMemo(() => {
    if (customBreadcrumbs) {
      return customBreadcrumbs;
    }

    if (!showBreadcrumbs || pathname === "/") {
      return [];
    }

    const segments = pathname.split("/").filter(Boolean);
    const crumbs: Breadcrumb[] = [
      {
        label: "Home",
        href: "/",
      },
    ];

    let currentPath = "";
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === segments.length - 1;

      // Use custom label if provided, otherwise format the segment
      const label = breadcrumbLabels[segment] || formatSegment(segment);

      crumbs.push({
        label,
        href: isLast ? undefined : currentPath,
      });
    });

    return crumbs;
  }, [pathname, customBreadcrumbs, showBreadcrumbs, breadcrumbLabels]);

  // Auto-determine if back button should be shown
  const shouldShowBackButton = useMemo(() => {
    if (showBackButton !== undefined) {
      return showBackButton;
    }
    // Auto-show back button if path is deeper than 1 level
    const pathDepth = pathname.split("/").filter(Boolean).length;
    return pathDepth > 1;
  }, [showBackButton, pathname]);

  // Determine back button target
  const backHref = useMemo(() => {
    if (backButtonHref) {
      return backButtonHref;
    }
    // Use second to last breadcrumb if available
    if (breadcrumbs.length >= 2) {
      return breadcrumbs[breadcrumbs.length - 2].href;
    }
    return undefined;
  }, [backButtonHref, breadcrumbs]);

  const handleBackClick = (e: React.MouseEvent) => {
    if (!backHref) {
      e.preventDefault();
      router.back();
    }
  };

  const content = (
    <div className={`space-y-3 ${className}`}>
      {/* Back Button */}
      {shouldShowBackButton && (
        <Link
          href={backHref || "#"}
          onClick={handleBackClick}
          className="inline-flex items-center font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {backButtonLabel}
        </Link>
      )}

      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <nav className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            const isHome = index === 0;
            return (
              <div key={index} className="flex items-center gap-2">
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="flex items-center gap-1.5 uppercase tracking-wider transition-colors hover:text-foreground"
                  >
                    {isHome && <Home className="h-3 w-3" />}
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="flex items-center gap-1.5 uppercase tracking-wider text-foreground">
                    {isHome && <Home className="h-3 w-3" />}
                    {crumb.label}
                  </span>
                )}
                {!isLast && (
                  <ChevronRight className="h-3 w-3 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </nav>
      )}

      {/* Main header content */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        {/* Left side - Title and subtitle */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            {Icon && <Icon className="h-8 w-8 flex-shrink-0 text-primary" />}
            <h1 className="font-mono text-3xl font-bold uppercase tracking-tight">
              {title}
            </h1>
          </div>
          {subtitle && (
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>

        {/* Right side - Injected content */}
        {rightContent && (
          <div className="flex flex-wrap items-center gap-3">
            {rightContent}
          </div>
        )}
      </div>
    </div>
  );

  if (!animated) {
    return content;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {content}
    </motion.div>
  );
}
