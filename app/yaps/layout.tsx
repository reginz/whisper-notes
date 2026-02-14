// Force dynamic rendering for all yaps routes (requires auth)
export const dynamic = "force-dynamic";

export default function YapsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
