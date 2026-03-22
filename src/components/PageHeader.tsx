interface PageHeaderProps {
  title: string;
  description?: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="hero-gradient py-16 md:py-20">
      <div className="container mx-auto px-4 lg:px-8 text-center">
        <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4 animate-fade-in">
          {title}
        </h1>
        {description && (
          <p className="text-primary-foreground/90 text-lg max-w-2xl mx-auto animate-slide-up">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
