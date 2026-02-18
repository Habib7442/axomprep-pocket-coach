"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LANGUAGES } from "@/lib/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Globe } from "lucide-react";

interface GenerationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (language: string) => void;
  title: string;
  description: string;
}

export function GenerationDialog({ isOpen, onClose, onGenerate, title, description }: GenerationDialogProps) {
  const [language, setLanguage] = useState("english");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border sm:max-w-[425px] overflow-hidden">
        {/* Glow Effect */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
        
        <DialogHeader className="space-y-4 pt-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-bold font-serif">{title}</DialogTitle>
          <DialogDescription className="text-muted-foreground font-medium">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-8 space-y-6">
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Globe className="w-3 h-3" /> Select Language
            </label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-full bg-secondary/20 border-border h-12 font-bold text-lg">
                <SelectValue placeholder="Choose language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value} className="font-bold py-3">
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="pb-4">
          <Button 
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black text-lg shadow-[0_0_20px_rgba(var(--primary),0.2)] hover:scale-[1.02] active:scale-95 transition-all"
            onClick={() => onGenerate(language)}
          >
            Start Learning Journey
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
