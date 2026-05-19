export default function Footer() {
  return (
    <footer className="bg-white text-helo-text py-6 mt-10">
      <div className="max-w-6xl mx-auto px-6 text-center">
        <p className="font-body">&copy; {new Date().getFullYear()} Helô Cosméticos. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}
