export function ComingSoonView({ title, description }: { title: string; description: string }) {
  return <div className="bg-white border border-[#DCE1EC] rounded p-8 text-center min-h-[320px] flex flex-col items-center justify-center">
    <span className="material-symbols-outlined text-[42px] text-[#283A97] mb-3">construction</span>
    <h1 className="text-[18px] font-bold text-[#0E1220]">{title}</h1>
    <p className="mt-2 text-[13px] text-[#59627A] max-w-lg">{description}</p>
  </div>;
}
