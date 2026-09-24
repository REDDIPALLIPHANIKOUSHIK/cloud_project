import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, where } from 'firebase/firestore';
import { deleteObject, getBytes, getStorage, ref, uploadBytes } from 'firebase/storage';
import { Activity, Download, FileText, Plus, ShieldCheck, Trash2, Upload } from 'lucide-react';
import { db } from './firebase.js';

const recordTypes = [
  ['visit-note', 'Visit note'],
  ['lab-report', 'Lab report'],
  ['prescription', 'Prescription'],
  ['imaging', 'Diagnostic image'],
  ['discharge-summary', 'Discharge summary'],
  ['other', 'Other clinical record'],
];
const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const maxFileSize = 10 * 1024 * 1024;

function errorText(error) {
  if (error?.code === 'permission-denied' || error?.code === 'storage/unauthorized') {
    return 'Access was denied. Confirm the Firestore and Storage rules are deployed to the Firebase project configured for this site.';
  }
  if (error?.code === 'failed-precondition') {
    return 'Firestore reports a missing index. Publish firebase/firestore.indexes.json and wait for it to finish building.';
  }
  if (error?.code === 'storage/object-not-found') return 'The attachment is no longer available in Firebase Storage.';
  return (error?.message || 'Check your connection and Firebase configuration.') + (error?.code ? ' (' + error.code + ')' : '');
}
function formatDate(value) {
  const date = value && typeof value.toDate === 'function' ? value.toDate() : new Date(value || 0);
  return Number.isNaN(date.getTime()) ? 'Just now' : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}
function csvCell(value) {
  let text = String(value ?? '');
  if (/^\s*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
function formatSize(bytes) {
  return bytes < 1024 * 1024 ? Math.max(1, Math.round(bytes / 1024)) + ' KB' : (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function MedicalRecords({ user, patients, notify }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [title, setTitle] = useState('');
  const [recordType, setRecordType] = useState('visit-note');
  const [summary, setSummary] = useState('');
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const recordsQuery = query(collection(db, 'medicalRecords'), where('ownerId', '==', user.uid), orderBy('createdAt', 'desc'));
    getDocs(recordsQuery)
      .then(snapshot => { if (active) setRecords(snapshot.docs.map(item => ({ id: item.id, ...item.data() }))); })
      .catch(error => { if (active) notify('Could not load medical records. ' + errorText(error)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user.uid, notify]);

  function chooseFile(event) {
    const selected = event.target.files?.[0] || null;
    if (selected && !allowedTypes.has(selected.type)) {
      notify('Use a PDF, JPEG, PNG, or WebP file.');
      event.target.value = '';
      setFile(null);
      return;
    }
    if (selected && selected.size > maxFileSize) {
      notify('Attachments must be 10 MB or smaller.');
      event.target.value = '';
      setFile(null);
      return;
    }
    setFile(selected);
  }

  async function saveRecord(event) {
    event.preventDefault();
    if (!patientId || !title.trim()) return;
    const patient = patients.find(item => item.id === patientId);
    if (!patient) { notify('Choose a patient in your workspace.'); return; }
    let uploadedPath = '';
    setBusy(true);
    try {
      if (file) {
        const safeName = file.name.replace(/[^\w.-]/g, '_').slice(-120) || 'attachment';
        uploadedPath = 'patient-files/' + user.uid + '/' + patientId + '/' + crypto.randomUUID() + '-' + safeName;
        await uploadBytes(ref(getStorage(), uploadedPath), file, { contentType: file.type });
      }
      const record = {
        ownerId: user.uid,
        patientId,
        patientName: patient.name,
        title: title.trim(),
        recordType,
        summary: summary.trim(),
        filePath: uploadedPath,
        fileName: file?.name || '',
        contentType: file?.type || '',
        fileSize: file?.size || 0,
        createdAt: serverTimestamp(),
      };
      const saved = await addDoc(collection(db, 'medicalRecords'), record);
      setRecords(current => [{ ...record, id: saved.id, createdAt: new Date() }, ...current]);
      setTitle('');
      setSummary('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      notify('Health record saved to the selected patient.', 'success');
    } catch (error) {
      if (uploadedPath) {
        try { await deleteObject(ref(getStorage(), uploadedPath)); } catch { /* Keep the original save error. */ }
      }
      notify('Could not save this health record. ' + errorText(error));
    } finally {
      setBusy(false);
    }
  }

  function exportRecords() {
    if (!records.length) return;
    const rows = [
      ['Patient', 'Title', 'Type', 'Created date', 'Summary', 'Attachment'],
      ...records.map(record => [
        record.patientName,
        record.title,
        recordTypes.find(item => item[0] === record.recordType)?.[1] || 'Other',
        (record.createdAt && typeof record.createdAt.toDate === 'function'
          ? record.createdAt.toDate()
          : new Date(record.createdAt || Date.now())).toISOString(),
        record.summary,
        record.fileName,
      ]),
    ];
    const csv = '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'medical-records-' + new Date().toISOString().slice(0, 10) + '.csv';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function downloadAttachment(record) {
    try {
      const bytes = await getBytes(ref(getStorage(), record.filePath));
      const url = URL.createObjectURL(new Blob([bytes], { type: record.contentType || 'application/octet-stream' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = record.fileName || 'health-record';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      notify('Could not download this attachment. ' + errorText(error));
    }
  }

  async function removeRecord(record) {
    if (!window.confirm('Delete this health record and its attachment? This cannot be undone.')) return;
    try {
      if (record.filePath) await deleteObject(ref(getStorage(), record.filePath));
      await deleteDoc(doc(db, 'medicalRecords', record.id));
      setRecords(current => current.filter(item => item.id !== record.id));
      notify('Health record deleted.', 'success');
    } catch (error) {
      notify('Could not delete this health record. ' + errorText(error));
    }
  }

  return <>
    <div className="page-head"><div><div className="eyebrow">CLOUD HEALTH RECORDS</div><h1>Medical records</h1><p>Securely organize visit notes, lab reports, prescriptions, and diagnostic files by patient.</p></div></div>
    <section className="panel" style={{ padding: 24, marginBottom: 24 }}>
      <div className="panel-head"><div><h3><Plus size={17}/> Add a health record</h3><p>Records and attachments are private to your account.</p></div></div>
      {patients.length ? <form onSubmit={saveRecord} className="record-form">
        <label>Patient<select required value={patientId} onChange={event => setPatientId(event.target.value)}><option value="">Select a patient…</option>{patients.map(patient => <option key={patient.id} value={patient.id}>{patient.name}</option>)}</select></label>
        <div className="form-row">
          <label>Record title<input required maxLength="120" value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Annual checkup"/></label>
          <label>Record type<select required value={recordType} onChange={event => setRecordType(event.target.value)}>{recordTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        <label>Clinical summary, symptoms, or findings<textarea maxLength="5000" rows="4" value={summary} onChange={event => setSummary(event.target.value)} placeholder="Add relevant history, symptoms, lab findings, or care notes."/></label>
        <label>Attachment (optional)<input type="file" ref={fileInputRef} accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={chooseFile}/><small>PDF or image, up to 10 MB. Files are stored privately in Firebase Storage.</small></label>
        {file && <div className="privacy-note"><FileText size={15}/>{file.name} · {formatSize(file.size)}</div>}
        <div className="assessment-submit"><span><ShieldCheck size={15}/> Owner-scoped access; files are not shared by public download URL.</span><button className="btn primary" disabled={busy}>{busy ? 'Saving record…' : <><Upload size={16}/> Save health record</>}</button></div>
      </form> : <div className="empty"><div className="empty-icon"><Activity size={21}/></div><b>Add a patient first</b><p>Medical records are attached to a patient in your private workspace.</p><Link className="text-link" to="/patients">Open patient directory</Link></div>}
    </section>
    <section className="panel recent-panel"><div className="panel-head"><div><h3>Patient records</h3><p>{records.length} saved {records.length === 1 ? 'record' : 'records'}</p></div><div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}><span className="privacy-note"><ShieldCheck size={15}/> Private to your account</span><button type="button" className="btn" disabled={loading || !records.length} onClick={exportRecords}><Download size={16}/> Export CSV</button></div></div>
      {loading ? <div className="empty">Loading medical records…</div> : records.length ? <div className="table-wrap"><table><thead><tr><th>PATIENT</th><th>RECORD</th><th>TYPE</th><th>DATE</th><th>ATTACHMENT</th><th>ACTIONS</th></tr></thead><tbody>{records.map(record => <tr key={record.id}><td>{record.patientName}</td><td><b>{record.title}</b>{record.summary && <span className="muted" style={{ display: 'block', maxWidth: 360 }}>{record.summary}</span>}</td><td>{recordTypes.find(item => item[0] === record.recordType)?.[1] || 'Other'}</td><td>{formatDate(record.createdAt)}</td><td>{record.fileName || '—'}</td><td>{record.filePath && <button className="icon-btn" onClick={() => downloadAttachment(record)} aria-label={'Download ' + record.fileName} title="Download attachment"><Download size={16}/></button>}<button className="icon-btn delete-btn" onClick={() => removeRecord(record)} aria-label={'Delete ' + record.title} title="Delete record"><Trash2 size={16}/></button></td></tr>)}</tbody></table></div> : <div className="empty"><div className="empty-icon"><FileText size={21}/></div><b>No medical records yet</b><p>Health records you add will appear here.</p></div>}
    </section>
  </>;
}
