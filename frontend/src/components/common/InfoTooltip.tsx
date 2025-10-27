interface InfoTooltipProps {
  text: string;
}

export function InfoTooltip({ text }: InfoTooltipProps) {
  return (
    <span className="relative inline-flex items-center group ml-1.5">
      <span className="cursor-help text-gray-400 hover:text-gray-600 text-sm select-none">
        ⓘ
      </span>
      <span className="pointer-events-none absolute left-1/2 top-full z-50 hidden w-72 -translate-x-1/2 rounded-lg border border-gray-200 bg-gray-900/95 px-3 py-2 text-[11px] leading-relaxed text-white shadow-xl group-hover:block">
        <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border border-gray-200 border-b-0 border-r-0 bg-gray-900/95" />
        {text}
      </span>
    </span>
  );
}

