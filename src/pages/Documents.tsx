import { useState } from 'react';
import { FileText, Upload, Download, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { allDocuments } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const categories = ['Tous', 'Contrats', 'Factures', 'États des lieux'] as const;
type DocFilter = typeof categories[number];

const catMap: Record<string, DocFilter> = {
  contrat: 'Contrats',
  facture: 'Factures',
  etat_des_lieux: 'États des lieux',
  autre: 'Tous',
};

const catColors: Record<string, string> = {
  contrat: 'bg-primary/10 text-primary',
  facture: 'bg-accent/10 text-accent',
  etat_des_lieux: 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]',
  autre: 'bg-muted text-muted-foreground',
};

export default function Documents() {
  const [activeFilter, setActiveFilter] = useState<DocFilter>('Tous');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const filtered = allDocuments.filter(d => {
    const matchesFilter = activeFilter === 'Tous' || catMap[d.category] === activeFilter;
    const matchesSearch = !searchQuery || d.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleDownload = (docName: string) => {
    toast({
      title: 'Téléchargement',
      description: `${docName} téléchargé avec succès`,
    });
  };

  const handleUpload = () => {
    toast({
      title: 'Upload',
      description: 'Fonctionnalité de téléversement simulée',
    });
  };

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
      <div className="flex items-center justify-between animate-fade-in">
        <h1 className="text-xl font-extrabold text-foreground">Documents</h1>
        <Button size="sm" className="rounded-xl font-semibold active:scale-95" onClick={handleUpload}>
          <Upload className="h-4 w-4 mr-1" />
          Importer
        </Button>
      </div>

      {/* Search */}
      <div className="relative animate-slide-up" style={{ animationDelay: '60ms' }}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un document..."
          className="rounded-xl pl-9"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 animate-slide-up" style={{ animationDelay: '100ms' }}>
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setActiveFilter(c)}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all active:scale-95',
              activeFilter === c ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 animate-slide-up" style={{ animationDelay: '150ms' }}>
        {[
          { label: 'Contrats', count: allDocuments.filter(d => d.category === 'contrat').length, cls: 'text-primary' },
          { label: 'Factures', count: allDocuments.filter(d => d.category === 'facture').length, cls: 'text-accent' },
          { label: 'États lieux', count: allDocuments.filter(d => d.category === 'etat_des_lieux').length, cls: 'text-[hsl(var(--warning))]' },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <p className={cn('text-xl font-extrabold', s.cls)}>{s.count}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Document List */}
      <div className="space-y-2">
        {filtered.map((doc, i) => {
          const catLabel = { contrat: 'Contrat', facture: 'Facture', etat_des_lieux: 'État des lieux', autre: 'Autre' }[doc.category];
          const color = catColors[doc.category];
          return (
            <Card key={doc.id} className="border-0 shadow-sm animate-slide-up" style={{ animationDelay: `${200 + i * 50}ms` }}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn('p-2.5 rounded-xl shrink-0', color)}>
                  <FileText className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{doc.name}</p>
                  <p className="text-[10px] text-muted-foreground">{catLabel} · {doc.date} · {doc.size}</p>
                </div>
                <button
                  onClick={() => handleDownload(doc.name)}
                  className="p-2 rounded-xl hover:bg-muted transition-colors active:scale-95"
                >
                  <Download className="h-4 w-4 text-primary" />
                </button>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-semibold text-muted-foreground">Aucun document trouvé</p>
            <p className="text-xs text-muted-foreground mt-1">Essayez de modifier vos filtres</p>
          </div>
        )}
      </div>
    </div>
  );
}
