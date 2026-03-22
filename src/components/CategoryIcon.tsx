import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

interface CategoryIconProps {
  icon: LucideIcon;
  label: string;
  link: string;
}

export function CategoryIcon({ icon: Icon, label, link }: CategoryIconProps) {
  return (
    <Link to={link} className="flex flex-col items-center gap-2 shrink-0">
      <div className="hero-gradient rounded-2xl p-4 transition-transform hover:scale-110">
        <Icon className="h-6 w-6 text-primary-foreground" />
      </div>
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
    </Link>
  );
}
