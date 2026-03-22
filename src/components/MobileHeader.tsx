import { Link } from 'react-router-dom';
import logo from '@/assets/logo.png';

export function MobileHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
      <div className="flex h-14 items-center justify-center px-4">
        <Link to="/" className="flex items-center">
          <img src={logo} alt="MeSéjours" className="h-8" />
        </Link>
      </div>
    </header>
  );
}
