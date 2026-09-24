import { FileQuestion, Send, X } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { endpoints } from '../utils/api.js';

const requiredApplicationQuestions = [
  'Contact number',
  'Email address',
  'Location / address',
  'Contact person',
  'Department / designation',
  'Experience and availability',
  'Languages, skills and project types',
  'Team size / daily capacity',
  'Current status',
  'Additional application answers'
];

export default function ProjectApplicationModal({ project, onClose, onSubmitted }) {
  const additionalQuestions = project.applicationQuestions?.filter(Boolean) || [];
  const questions = [...requiredApplicationQuestions, ...additionalQuestions.filter((question) => !requiredApplicationQuestions.includes(question))];
  const [answers, setAnswers] = useState(() => questions.map(() => ''));
  const [submitting, setSubmitting] = useState(false);

  function changeAnswer(index, value) {
    setAnswers((current) => current.map((answer, answerIndex) => answerIndex === index ? value : answer));
  }

  async function submit(event) {
    event.preventDefault();
    if (answers.some((answer) => !answer.trim())) {
      toast.error('Please answer every question before applying.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await endpoints.applyToProject(project._id, questions.map((question, index) => ({ question, answer: answers[index].trim() })));
      toast.success(response.message);
      onSubmitted?.();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5">
      <form onSubmit={submit} className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Project application</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">Apply for {project.name}</h2>
            <p className="mt-1 text-sm text-slate-500">Answer every required question to submit your application.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" aria-label="Close application form"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          {questions.map((question, index) => (
            <label key={question} className="block">
              <span className="mb-2 flex items-start gap-2 text-sm font-semibold text-slate-800"><FileQuestion className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />{index + 1}. {question}<span className="text-rose-500">*</span></span>
              <textarea required value={answers[index]} onChange={(event) => changeAnswer(index, event.target.value)} placeholder="Write your answer..." className="input min-h-28 resize-y" />
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={submitting}><Send className="h-4 w-4" />{submitting ? 'Sending...' : 'Submit application'}</button>
        </div>
      </form>
    </div>
  );
}
