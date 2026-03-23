import { useState, useRef } from 'react';
import { FileText, Upload, Download, Search, Trash2, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useDocuments, useUploadDocument, useDeleteDocument } from '@/hooks/use-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useProperties } from '@/hooks/use-data';

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
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadForm, setUploadForm] = useState({ name: '', category: 'autre', propertyId: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { data: documents, isLoading } = useDocuments();
  const { data: properties } = useProperties();
  const uploadDocument = useUploadDocument();
  const deleteDocument = useDeleteDocument();

  const allDocs = documents || [];
  const filtered = allDocs.filter(d => {
    const matchesFilter = activeFilter === 'Tous' || catMap[d.category] === activeFilter;
    const matchesSearch = !searchQuery || d.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleDownload = (fileUrl: string | null, docName: string) => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    } else {
      toast({ title: 'Téléchargement', description: `${docName} – pas de fichier associé` });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadForm.name) {
      toast({ title: 'Erreur', description: 'Veuillez sélectionner un fichier et saisir un nom', variant: 'destructive' });
      return;
    }
    try {
      await uploadDocument.mutateAsync({
        file: selectedFile,
        name: uploadForm.name,
        category: uploadForm.category,
        propertyId: uploadForm.propertyId || undefined,
      });
      toast({ title: 'Succès', description: 'Document importé avec succès' });
      setShowUploadDialog(false);
      setSelectedFile(null);
      setUploadForm({ name: '', category: 'autre', propertyId: '' });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible d\'importer le document', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteDocument.mutateAsync(id);
      toast({ title: 'Supprimé', description: `${name} supprimé` });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de supprimer', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
        <Skeleton className="h-8 w-32" /><Skeleton className="h-10 rounded-xl" />
        <div className="grid grid-cols-3 gap-3"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
      </div>
    );
  }

  const catCounts = {
    contrat: allDocs.filter(d => d.category === 'contrat').length,
    facture: allDocs.filter(d => d.category === 'facture').length,
    etat_des_lieux: allDocs.filter(d => d.category === 'etat_des_lieux').length,
  };

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
      <div className="flex items-center justify-between animate-fade-in">
        <h1 className="text-xl font-extrabold text-foreground">Documents</h1>
        <Button size="sm" className="rounded-xl font-semibold active:scale-95" onClick={() => setShowUploadDialog(true)}>
          <Upload className="h-4 w-4 mr-1" />
          Importer
        </Button>
      </div>

      <div className="relative animate-slide-up" style={{ animationDelay: '60ms' }}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher un document..." className="rounded-xl pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 animate-slide-up" style={{ animationDelay: '100ms' }}>
        {categories.map(c => (
          <button key={c} onClick={() => setActiveFilter(c)}
            className={cn('px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all active:scale-95',
              activeFilter === c ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}>{c}</button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 animate-slide-up" style={{ animationDelay: '150ms' }}>
        {[
          { label: 'Contrats', count: catCounts.contrat, cls: 'text-primary' },
          { label: 'Factures', count: catCounts.facture, cls: 'text-accent' },
          { label: 'États lieux', count: catCounts.etat_des_lieux, cls: 'text-[hsl(var(--warning))]' },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <p className={cn('text-xl font-extrabold', s.cls)}>{s.count}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((doc, i) => {
          const catLabel = { contrat: 'Contrat', facture: 'Facture', etat_des_lieux: 'État des lieux', autre: 'Autre' }[doc.category] || 'Autre';
          const color = catColors[doc.category] || catColors.autre;
          return (
            <Card key={doc.id} className="border-0 shadow-sm animate-slide-up" style={{ animationDelay: `${200 + i * 50}ms` }}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn('p-2.5 rounded-xl shrink-0', color)}>
                  <FileText className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{doc.name}</p>
                  <p className="text-[10px] text-muted-foreground">{catLabel} · {new Date(doc.created_at).toLocaleDateString('fr-FR')} · {doc.file_size || '–'}</p>
                </div>
                <button onClick={() => handleDownload(doc.file_url, doc.name)} className="p-2 rounded-xl hover:bg-muted transition-colors active:scale-95">
                  <Download className="h-4 w-4 text-primary" />
                </button>
                <button onClick={() => handleDelete(doc.id, doc.name)} className="p-2 rounded-xl hover:bg-destructive/10 transition-colors active:scale-95">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-semibold text-muted-foreground">Aucun document trouvé</p>
            <p className="text-xs text-muted-foreground mt-1">Importez votre premier document</p>
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold">Importer un document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Nom du document</label>
              <Input placeholder="ex: Contrat de bail" className="rounded-xl" value={uploadForm.name} onChange={e => setUploadForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Catégorie</label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: 'contrat', label: 'Contrat' },
                  { value: 'facture', label: 'Facture' },
                  { value: 'etat_des_lieux', label: 'État des lieux' },
                  { value: 'autre', label: 'Autre' },
                ].map(c => (
                  <button key={c.value} onClick={() => setUploadForm(f => ({ ...f, category: c.value }))}
                    className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95',
                      uploadForm.category === c.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    )}>{c.label}</button>
                ))}
              </div>
            </div>
            {properties && properties.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Bien associé (optionnel)</label>
                <select
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  value={uploadForm.propertyId}
                  onChange={e => setUploadForm(f => ({ ...f, propertyId: e.target.value }))}
                >
                  <option value="">Aucun</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Fichier</label>
              <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden"
                onChange={e => { if (e.target.files?.[0]) setSelectedFile(e.target.files[0]); }} />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium text-foreground">{selectedFile.name}</span>
                    <button onClick={e => { e.stopPropagation(); setSelectedFile(null); }} className="p-1 hover:bg-muted rounded-lg">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Cliquez pour sélectionner un fichier</p>
                    <p className="text-[10px] text-muted-foreground mt-1">PDF, DOC, JPG, PNG</p>
                  </>
                )}
              </div>
            </div>
            <Button className="w-full rounded-xl font-semibold" onClick={handleUpload} disabled={uploadDocument.isPending || !selectedFile}>
              {uploadDocument.isPending ? 'Import en cours...' : 'Importer le document'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
