export default function LoadingFincob() {
  return (
    <div className="w-full py-3">
      <div className="relative w-full h-[3px] bg-gray-200 dark:bg-gray-700 overflow-hidden rounded-full">
        <div
          className="
            absolute inset-0 w-1/3 h-full
            animate-loadingFincobGradient
            rounded-full
            bg-gradient-to-r
            from-blue-400
            via-blue-600
            to-blue-400
            shadow-[0_0_12px_rgba(59,130,246,0.6)]
          "
        ></div>
      </div>
    </div>
  );
}
