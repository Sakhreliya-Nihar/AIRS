import { useState, useEffect } from "react";
import { Save, Shield, Briefcase, Wrench } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function Settings() {
    const [techLevel, setTechLevel] = useState("business_owner");
    const [saving, setSaving] = useState(false);

    // Load the current setting from Firestore on mount
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const docRef = doc(db, "settings", "global_config");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setTechLevel(docSnap.data().tech_level || "business_owner");
                }
            } catch (err) {
                console.error("Failed to load settings:", err);
            }
        };
        fetchSettings();
    }, []);

    // save the selection back to Firestore
    const handleSave = async () => {
        setSaving(true);
        try {
            // 'merge: true' to not overwrite other future settings
            await setDoc(doc(db, "settings", "global_config"), {
                tech_level: techLevel
            }, { merge: true });
            alert("System personality updated successfully!");
        } catch (e) {
            console.error(e);
            alert("Error saving settings");
        }
        setSaving(false);
    };

    // Helper component for the selection cards
    const LevelCard = ({ id, label, icon: Icon, description }) => (
        <div
            onClick={() => setTechLevel(id)}
            className={`cursor-pointer p-5 rounded-xl border-2 transition-all flex items-start gap-4 ${techLevel === id
                    ? "border-indigo-600 bg-indigo-50"
                    : "border-slate-200 hover:border-indigo-300 bg-white"
                }`}
        >
            <div className={`p-3 rounded-lg ${techLevel === id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                <Icon size={24} />
            </div>
            <div>
                <h3 className={`font-bold ${techLevel === id ? "text-indigo-900" : "text-slate-700"}`}>{label}</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>
            </div>
        </div>
    );

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h2 className="text-3xl font-black text-slate-800 mb-2">System Configuration</h2>
            <p className="text-slate-500 mb-8">Customize how the AI interprets and reports security events.</p>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Shield size={20} className="text-indigo-500" />
                    AI Analyst Personality
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <LevelCard
                        id="business_owner"
                        label="Business Owner"
                        icon={Briefcase}
                        description="Plain English. Focuses on risk, business impact, and whether you need to call an expert."
                    />
                    <LevelCard
                        id="it_support"
                        label="IT Support"
                        icon={Wrench}
                        description="Action-oriented. Suggests standard fixes, firewall rules, and password resets."
                    />
                    <LevelCard
                        id="soc_analyst"
                        label="SOC Analyst"
                        icon={Shield}
                        description="Deep technical dive. Analyzes raw payloads, attack vectors, and IOCs."
                    />
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-600 transition-colors disabled:opacity-50"
                    >
                        <Save size={18} />
                        {saving ? "Saving Configuration..." : "Save Preferences"}
                    </button>
                </div>
            </div>
        </div>
    );
}