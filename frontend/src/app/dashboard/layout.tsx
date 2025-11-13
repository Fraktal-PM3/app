import { PackageProvider } from './components/PackageContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PackageProvider>
      <div className="min-h-screen bg-background">
        {children}
      </div>
    </PackageProvider>
  );
}