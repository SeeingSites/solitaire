interface StockPileProps {
  count: number;
  onClick?: () => void;
}

const cardStyle = {
  width: "var(--card-w)",
  height: "var(--card-h)",
  borderRadius: "var(--card-radius)",
};

const innerStyle = {
  width: "calc(var(--card-w) - 8px)",
  height: "calc(var(--card-h) - 8px)",
  borderRadius: "calc(var(--card-radius) - 2px)",
};

export default function StockPile({ count, onClick }: StockPileProps) {
  return (
    <div
      className={`relative border-2 border-gray-600
                 ${count > 0 ? "bg-gradient-to-br from-blue-800 to-blue-900 cursor-pointer hover:shadow-lg" : "bg-gray-800/50"}
                 flex items-center justify-center transition-all duration-150`}
      style={cardStyle}
      onClick={onClick}
    >
      {count > 0 ? (
        <>
          <div
            className="rounded border border-blue-600 flex items-center justify-center"
            style={innerStyle}
          >
            <span className="text-blue-400" style={{ fontSize: "var(--card-font-center)" }}>
              ♠
            </span>
          </div>
          <div className="absolute -bottom-1 -right-1 bg-blue-700 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            {count}
          </div>
        </>
      ) : (
        <span className="text-gray-500 text-[10px]">Empty</span>
      )}
    </div>
  );
}
