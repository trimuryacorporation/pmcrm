import { Users } from 'lucide-react';

const resourcesForType = {
  Vendor: { list: 'vendors', field: 'vendor' },
  Freelancer: { list: 'freelancers', field: 'freelancer' }
};

export default function SelectedLanguageTeamCounts({ languages = [], assignedToType, form = {}, references = {}, value = [], onChange }) {
  const selectedLanguages = Array.isArray(languages) ? languages : languages ? [languages] : [];
  const assignment = resourcesForType[assignedToType];
  const assigneeId = assignment && (form[assignment.field]?._id || form[assignment.field]);
  const assignee = assignment && (references[assignment.list] || []).find((option) => String(option.value) === String(assigneeId));
  const sourceTeamCounts = assignee?.record?.languageTeamCounts || [];

  if (!selectedLanguages.length) return <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-xs text-slate-500">Select languages to view their team count.</p>;
  if (!assignment) return <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-xs text-slate-500">Select a Vendor or Freelancer to view language-wise team count.</p>;
  if (!assignee) return <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-xs text-slate-500">Select a {assignedToType} to view language-wise team count.</p>;

  function sourceCountFor(language) {
    if (language === 'Any / All Languages') return sourceTeamCounts.reduce((total, item) => total + (Number(item.teamCount) || 0), 0);
    return sourceTeamCounts.find((item) => item.language === language)?.teamCount ?? 0;
  }

  function countFor(language) {
    return (value || []).find((item) => item.language === language)?.teamCount ?? sourceCountFor(language);
  }

  function setCount(language, teamCount) {
    onChange(selectedLanguages.map((selectedLanguage) => ({
      language: selectedLanguage,
      teamCount: selectedLanguage === language ? teamCount : countFor(selectedLanguage)
    })));
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {selectedLanguages.map((language) => (
        <div key={language} className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Users className="h-4 w-4 text-indigo-600" /><span className="truncate">{language === 'Any / All Languages' ? 'All Languages' : language}</span></div>
          <p className="mt-2 text-xs font-medium text-slate-600">Team count</p>
          <input className="input mt-1 h-9 bg-white text-lg font-bold text-indigo-700" type="number" min="0" value={countFor(language)} onChange={(event) => setCount(language, Math.max(0, Number(event.target.value)))} />
          <p className="mt-1 text-xs text-slate-500">Fetched availability: {sourceCountFor(language)}</p>
        </div>
      ))}
    </div>
  );
}
