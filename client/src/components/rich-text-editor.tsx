import { useRef, useEffect } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link as LinkIcon,
  Eraser,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

/**
 * Éditeur de texte enrichi minimaliste (sans dépendance) basé sur
 * contentEditable + document.execCommand. Produit du HTML.
 */
export default function RichTextEditor({
  value,
  onChange,
  placeholder,
}: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Contenu initial injecté une seule fois (évite les sauts de curseur)
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exec = (cmd: string, arg?: string) => {
    document.execCommand(cmd, false, arg);
    ref.current?.focus();
    onChange(ref.current?.innerHTML || "");
  };

  const btn =
    "p-2 rounded hover:bg-gray-200 text-gray-700 transition-colors";

  return (
    <div className="border rounded-md">
      <style>{`.rte-empty:empty:before{content:attr(data-placeholder);color:#9ca3af;}`}</style>
      <div className="flex flex-wrap gap-1 border-b p-1 bg-gray-50">
        <button type="button" className={btn} onClick={() => exec("bold")} title="Gras">
          <Bold className="h-4 w-4" />
        </button>
        <button type="button" className={btn} onClick={() => exec("italic")} title="Italique">
          <Italic className="h-4 w-4" />
        </button>
        <button type="button" className={btn} onClick={() => exec("underline")} title="Souligné">
          <Underline className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => exec("insertUnorderedList")}
          title="Liste à puces"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => exec("insertOrderedList")}
          title="Liste numérotée"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => {
            const url = window.prompt("Adresse du lien (URL) :", "https://");
            if (url) exec("createLink", url);
          }}
          title="Insérer un lien"
        >
          <LinkIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => exec("removeFormat")}
          title="Effacer la mise en forme"
        >
          <Eraser className="h-4 w-4" />
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        onInput={() => onChange(ref.current?.innerHTML || "")}
        data-placeholder={placeholder}
        className="rte-empty min-h-[180px] p-3 text-sm focus:outline-none"
        style={{ whiteSpace: "pre-wrap" }}
      />
    </div>
  );
}
