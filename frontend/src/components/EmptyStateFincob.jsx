export default function EmptyStateFincob({ text = "Nenhum item encontrado" }) {
  return (
    <div className="text-center py-10 opacity-60 text-sm">
      {text}
    </div>
  );
}
