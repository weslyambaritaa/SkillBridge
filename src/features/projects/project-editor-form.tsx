"use client";

import { useState } from "react";
import { saveProjectDraft } from "@/features/projects/actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";

type TaxonomyItem = { id: string; name: string; category?: string | null };
export type EditorRole = { title: string; description: string; slotCount: number; requiredSkillIds: string[]; preferredSkillIds: string[] };
export type EditorProject = {
  id?: string; title: string; problemStatement: string; objective: string; scope: string; expectedDeliverables: string;
  categoryId: string; difficulty: string; paymentType: string; proposedCompensationAmount: number | null;
  estimatedDurationDays: number | null; roles: EditorRole[];
};

const emptyProject: EditorProject = {
  title: "", problemStatement: "", objective: "", scope: "", expectedDeliverables: "", categoryId: "",
  difficulty: "BEGINNER", paymentType: "UNPAID", proposedCompensationAmount: null, estimatedDurationDays: null,
  roles: [{ title: "", description: "", slotCount: 1, requiredSkillIds: [], preferredSkillIds: [] }],
};

export function ProjectEditorForm({
  project = emptyProject,
  categories,
  skills,
  error,
}: {
  project?: EditorProject;
  categories: TaxonomyItem[];
  skills: TaxonomyItem[];
  error?: string;
}) {
  const [state, setState] = useState<EditorProject>(project);
  const update = (key: keyof EditorProject, value: EditorProject[keyof EditorProject]) => setState((old) => ({ ...old, [key]: value }));
  const updateRole = (index: number, change: Partial<EditorRole>) => setState((old) => ({ ...old, roles: old.roles.map((role, roleIndex) => roleIndex === index ? { ...role, ...change } : role) }));
  const toggleSkill = (index: number, skillId: string, kind: "requiredSkillIds" | "preferredSkillIds", checked: boolean) => {
    setState((old) => ({
      ...old,
      roles: old.roles.map((role, roleIndex) => {
        if (roleIndex !== index) return role;
        const otherKind = kind === "requiredSkillIds" ? "preferredSkillIds" : "requiredSkillIds";
        const selected = new Set(role[kind]);
        const other = new Set(role[otherKind]);
        if (checked) { selected.add(skillId); other.delete(skillId); } else selected.delete(skillId);
        return { ...role, [kind]: [...selected], [otherKind]: [...other] };
      }),
    }));
  };
  const payment = state.paymentType === "PAID";
  const payload = {
    title: state.title, problemStatement: state.problemStatement, objective: state.objective, scope: state.scope,
    expectedDeliverables: state.expectedDeliverables, categoryId: state.categoryId, difficulty: state.difficulty,
    paymentType: state.paymentType, proposedCompensationAmount: payment ? state.proposedCompensationAmount : null,
    estimatedDurationDays: state.estimatedDurationDays, roles: state.roles,
  };

  return <form action={saveProjectDraft} className="form-stack">
    {state.id && <input type="hidden" name="projectId" value={state.id}/>}
    <input type="hidden" name="payload" value={JSON.stringify(payload)}/>
    {error && <p className="notice notice-error">Perubahan tidak dapat disimpan. Pastikan data valid dan project dapat diedit.</p>}
    <label className="field">Judul project<input value={state.title} minLength={5} maxLength={120} onChange={(event) => update("title", event.target.value)} required/></label>
    <label className="field">Masalah yang ingin diselesaikan<textarea value={state.problemStatement} minLength={30} maxLength={4000} onChange={(event) => update("problemStatement", event.target.value)} required/></label>
    <label className="field">Tujuan<textarea value={state.objective} minLength={20} maxLength={2400} onChange={(event) => update("objective", event.target.value)} required/></label>
    <label className="field">Lingkup pekerjaan<textarea value={state.scope} minLength={20} maxLength={6000} onChange={(event) => update("scope", event.target.value)} required/></label>
    <label className="field">Hasil yang diharapkan<textarea value={state.expectedDeliverables} minLength={20} maxLength={4000} onChange={(event) => update("expectedDeliverables", event.target.value)} required/></label>
    <label className="field">Kategori<select value={state.categoryId} onChange={(event) => update("categoryId", event.target.value)} required><option value="">Pilih kategori</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label className="field">Tingkat kesulitan<select value={state.difficulty} onChange={(event) => update("difficulty", event.target.value)}><option value="BEGINNER">Beginner</option><option value="INTERMEDIATE">Intermediate</option><option value="ADVANCED">Advanced</option></select></label>
    <label className="field">Tipe penawaran<select value={state.paymentType} onChange={(event) => update("paymentType", event.target.value)}><option value="UNPAID">Unpaid</option><option value="PAID">Paid</option></select></label>
    {payment && <label className="field">Kompensasi yang diiklankan (opsional)<input type="number" min="1" step="1" value={state.proposedCompensationAmount ?? ""} onChange={(event) => update("proposedCompensationAmount", event.target.value ? Number(event.target.value) : null)}/><small>Masukkan nominal rupiah utuh, misalnya 3000000. Ini angka usulan untuk listing, bukan jumlah final yang disepakati.</small></label>}
    <label className="field">Estimasi durasi (hari, opsional)<input type="number" min="1" max="365" value={state.estimatedDurationDays ?? ""} onChange={(event) => update("estimatedDurationDays", event.target.value ? Number(event.target.value) : null)}/></label>

    <h2>Project roles</h2>
    <p className="muted">Setiap role perlu minimal satu required skill sebelum project diajukan.</p>
    {state.roles.map((role, index) => <article className="role-editor" key={index}>
      <div className="role-editor-heading"><h3>Role {index + 1}</h3>{state.roles.length > 1 && <button className="button button-secondary" type="button" onClick={() => update("roles", state.roles.filter((_, roleIndex) => roleIndex !== index))}>Hapus role</button>}</div>
      <label className="field">Nama role<input value={role.title} minLength={2} maxLength={100} onChange={(event) => updateRole(index, { title: event.target.value })} required/></label>
      <label className="field">Deskripsi role<textarea value={role.description} minLength={10} maxLength={1600} onChange={(event) => updateRole(index, { description: event.target.value })} required/></label>
      <label className="field">Jumlah slot<input type="number" min="1" max="20" value={role.slotCount} onChange={(event) => updateRole(index, { slotCount: Number(event.target.value) })} required/></label>
      <fieldset className="skill-picker"><legend>Skill role</legend><p className="muted">Required dipilih: {role.requiredSkillIds.length} · Preferred dipilih: {role.preferredSkillIds.length}</p>{skills.map((skill) => <div className="skill-choice" key={skill.id}><span>{skill.name}{skill.category ? ` · ${skill.category}` : ""}</span><label><input type="checkbox" checked={role.requiredSkillIds.includes(skill.id)} onChange={(event) => toggleSkill(index, skill.id, "requiredSkillIds", event.target.checked)}/>Required</label><label><input type="checkbox" checked={role.preferredSkillIds.includes(skill.id)} onChange={(event) => toggleSkill(index, skill.id, "preferredSkillIds", event.target.checked)}/>Preferred</label></div>)}</fieldset>
    </article>)}
    {state.roles.length < 12 && <button className="button button-secondary" type="button" onClick={() => update("roles", [...state.roles, { title: "", description: "", slotCount: 1, requiredSkillIds: [], preferredSkillIds: [] }])}>Tambah role</button>}
    <PendingSubmitButton pendingLabel="Menyimpan draft...">Simpan draft dan preview</PendingSubmitButton>
  </form>;
}
