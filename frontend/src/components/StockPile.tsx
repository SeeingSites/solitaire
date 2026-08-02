interface StockPileProps {
  count: number;
  onClick?: () => void;
}

export default function StockPile({ count, onClick }: StockPileProps) {
  return (
    <div
      className={`relative w-20 h-28 rounded-lg border-2 border-gray-600 
                 ${count > 0 ? "bg-gradient-to-br from-blue-800 to-blue-900 cursor-pointer hover:shadow-lg" : "bg-gray-800/50"}
                 flex items-center justify-center transition-all duration-150`}
      onClick={onClick}
    >
      {count > 0 ? (
        <>
          <div className="w-16 h-24 rounded border border-blue-600 flex items-center justify-center">
            <span className="text-blue-400 text-2xl">♠</span>
          </div>
          <div className="absolute -bottom-2 -right-2 bg-blue-700 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {count}
          </div>
        </>
      ) : (
        <span className="text-gray-500 text-xs">Empty</span>
      )}
    </div>
  );
}
