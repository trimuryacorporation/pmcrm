import { Users } from 'lucide-react';

export default function LanguageTeamCounts({ languages = [], value = [], onChange }) {
  const selectedLanguages = Array.isArray(languages) ? languages : languages ? [languages] : [];
  const counts = Array.isArray(value) ? value : [];

  if (!selectedLanguages.length) {
    return <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-xs text-slate-500">Select one or more languages first.</p>;
  }

  function countFor(language) {
    return counts.find((item) => item.language === language)?.teamCount ?? 0;
  }

  function setCount(language, teamCount) {
    const next = selectedLanguages.map((selectedLanguage) => ({
      language: selectedLanguage,
      teamCount: selectedLanguage === language ? teamCount : countFor(selectedLanguage)
    }));
    onChange(next);
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {selectedLanguages.map((language) => (
        <div key={language} className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Users className="h-4 w-4 text-indigo-600" />
            <span className="truncate" title={language}>{language === 'Any / All Languages' ? 'All Languages' : language}</span>
          </div>
          <div className="mt-2 text-xs font-medium text-slate-600">
            <span>{language === 'Any / All Languages' ? 'Total team count for all languages' : 'Team count'}</span>
            <input
              className="input mt-1 h-9 bg-white"
              type="number"
              min="0"
              value={countFor(language)}
              onChange={(event) => setCount(language, Math.max(0, Number(event.target.value)))}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
