import {
  X,
  ZoomIn,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";

export default function ProductImagePreview({
  alt,
  className = "",
  imageClassName = "",
  sizes,
  src,
  zoomLabel = "Ampliar imagem",
}) {
  const [open,
    setOpen] =
    useState(false);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";
    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [open]);

  if (!src) {
    return (
      <div className={`flex items-center justify-center text-zinc-400 ${className}`}>
        Sem imagem
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group/image relative block overflow-hidden text-left ${className}`}
        aria-label={zoomLabel}
      >
        <img
          src={src}
          alt={alt}
          className={imageClassName}
          loading="lazy"
          decoding="async"
          sizes={sizes}
        />
        <span className="absolute bottom-3 right-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#873c50] opacity-0 shadow-sm transition group-hover/image:opacity-100 group-focus-visible/image:opacity-100">
          <ZoomIn size={18} />
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[#1f1117]/85 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={alt || "Imagem ampliada do produto"}
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setOpen(false);
            }}
            className="absolute right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#43232d] shadow-lg transition hover:bg-[#fff1f5]"
            aria-label="Fechar imagem ampliada"
          >
            <X size={20} />
          </button>

          <img
            src={src}
            alt={alt}
            className="max-h-[88vh] max-w-[94vw] rounded-3xl bg-white object-contain shadow-[0_30px_90px_rgba(0,0,0,0.35)]"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
