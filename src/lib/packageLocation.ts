// Composes the human-readable location label shown for a package across the
// site (list cards, home featured grid, agent profile grid, details page,
// checkout). Falls back through the admin1/state hierarchy so that packages
// without a city-level state still surface the country, and avoids duplicating
// the country when an admin1 or state is already present.
export interface PackageLocationFields {
  package_location?: string | null;
  package_admin1_name?: string | null;
  agent_state?: string | null;
  agent_country?: string | null;
}

export const formatPackageLocation = (pkg: PackageLocationFields | null | undefined): string => {
  if (!pkg) return '';
  const admin1 = pkg.package_admin1_name || pkg.agent_state || null;
  const country = !admin1 && pkg.agent_country ? pkg.agent_country : null;
  return [pkg.package_location || null, admin1, country]
    .map((part) => (part ? String(part).trim() : ''))
    .filter(Boolean)
    .join(', ');
};
