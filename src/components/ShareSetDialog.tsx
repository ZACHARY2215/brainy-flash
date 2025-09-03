import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Copy, Share2, Check, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface ShareSetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setId: string;
  setTitle: string;
}

const ShareSetDialog: React.FC<ShareSetDialogProps> = ({
  open,
  onOpenChange,
  setId,
  setTitle
}) => {
  const [shareUrl, setShareUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (open && setId) {
      generateShareLink();
    }
  }, [open, setId]);

  const generateShareLink = async () => {
    try {
      setLoading(true);
      
      // Generate shareable link by creating a simple URL
      const shareToken = crypto.randomUUID();
      const url = `${window.location.origin}/set/${setId}/preview?token=${shareToken}`;
      setShareUrl(url);
    } catch (error) {
      console.error('Error generating share link:', error);
      // Fallback to direct URL
      const fallbackUrl = `${window.location.origin}/set/${setId}/preview`;
      setShareUrl(fallbackUrl);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error('Failed to copy link');
    }
  };

  const shareViaEmail = () => {
    const subject = `Check out "${setTitle}" flashcard set`;
    const body = `I wanted to share this flashcard set with you: ${shareUrl}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share "{setTitle}"
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Share Link</label>
            <div className="flex gap-2">
              <Input
                value={shareUrl}
                readOnly
                placeholder={loading ? "Generating link..." : ""}
                className="flex-1"
              />
              <Button
                onClick={copyToClipboard}
                variant="outline"
                size="sm"
                disabled={!shareUrl || loading}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={shareViaEmail} variant="outline" disabled={!shareUrl}>
              Email
            </Button>
            <Button 
              onClick={() => window.open(shareUrl, '_blank')}
              variant="outline" 
              disabled={!shareUrl}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Preview
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            Anyone with this link can view and study your flashcard set. They don't need to sign up.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareSetDialog;