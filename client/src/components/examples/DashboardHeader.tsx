import { DashboardHeader } from '../DashboardHeader';

export default function DashboardHeaderExample() {
  return (
    <DashboardHeader 
      onMenuClick={() => console.log('Menu clicked')}
      onThemeToggle={() => console.log('Theme toggled')}
    />
  );
}
