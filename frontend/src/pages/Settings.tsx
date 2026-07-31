import { useState, useEffect } from "react";
import { Save, Shield, Briefcase, Wrench, LogOut, User, AlertTriangle, Bell, BellOff, MailWarning, Zap } from "lucide-react";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { signOut, deleteUser } from "firebase/auth";

export default function Settings() {
    const [techLevel, setTechLevel] = useState("business_owner");
    // --- NEW: Notification State ---
    const [notificationLevel, setNotificationLevel] = useState("critical");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            const user = auth.currentUser;
            if (!user) return;

            try {
                const docRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.tech_level) setTechLevel(data.tech_level);
                    // Load saved notification preference
                    if (data.notification_level) setNotificationLevel(data.notification_level);
                }
            } catch (err) {
                console.error("Failed to load settings:", err);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        const user = auth.currentUser;
        if (!user) {
            alert("Authentication error: No user logged in.");
            return;
        }

        setSaving(true);
        try {
            // Save BOTH preferences to Firestore
            await setDoc(doc(db, "users", user.uid), {
                tech_level: techLevel,
                notification_level: notificationLevel
            }, { merge: true });

            alert("Account preferences updated successfully!");
        } catch (e) {
            console.error(e);
            alert("Error saving settings");
        }
        setSaving(false);
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            window.location.reload();
        } catch (error) {
            console.error("Error signing out:", error);
            alert("Failed to sign out. Please try again.");
        }
    };

    const handleDeleteAccount = async () => {
        const user = auth.currentUser;
        if (!user) return;

        const confirmDelete = window.confirm(
            "Are you absolutely sure you want to delete your account? This action cannot be undone and will erase all your preferences."
        );

        if (confirmDelete) {
            try {
                await deleteDoc(doc(db, "users", user.uid));
                await deleteUser(user);
                alert("Your account has been successfully deleted.");
                window.location.reload();
            } catch (error: any) {
                console.error("Error deleting account:", error);
                if (error.code === 'auth/requires-recent-login') {
                    alert("For security reasons, please log out and log back in before deleting your account.");
                } else {
                    alert("Failed to delete account. Please try again.");
                }
            }
        }
    };

    // Helper component for AI Personality Cards
    const LevelCard = ({ id, label, icon: Icon, description }: any) => (
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


    // Helper component for Notification Cards
    const NotificationCard = ({ id, label, icon: Icon, description, colorClass }: any) => (
        <div
            onClick={() => setNotificationLevel(id)}
            className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${notificationLevel === id
                ? `border-${colorClass}-500 bg-${colorClass}-50`
                : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
        >
            <div className={`p-2 rounded-lg ${notificationLevel === id ? `bg-${colorClass}-500 text-white` : "bg-slate-100 text-slate-500"}`}>
                <Icon size={20} />
            </div>
            <div>
                <h3 className={`font-bold text-sm ${notificationLevel === id ? `text-${colorClass}-900` : "text-slate-700"}`}>{label}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{description}</p>
            </div>
        </div>
    );


    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <div>
                <h2 className="text-3xl font-black text-slate-800 mb-2">Account Settings</h2>
                <p className="text-slate-500">Manage your preferences and session details.</p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Shield size={20} className="text-indigo-500" />
                    AI Analyst Personality
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <LevelCard id="business_owner" label="Business Owner" icon={Briefcase} description="Plain English. Focuses on risk, business impact, and whether you need to call an expert." />
                    <LevelCard id="it_support" label="IT Support" icon={Wrench} description="Action-oriented. Suggests standard fixes, firewall rules, and password resets." />
                    <LevelCard id="soc_analyst" label="SOC Analyst" icon={Shield} description="Deep technical dive. Analyzes raw payloads, attack vectors, and IOCs." />
                </div>

                {/* --- NEW: Email Notifications Section --- */}
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 pt-6 border-t border-slate-100">
                    <Bell size={20} className="text-indigo-500" />
                    Email Notifications
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <NotificationCard
                        id="all"
                        label="All Incidents"
                        icon={Bell}
                        colorClass="indigo"
                        description="Get an email for every single security event."
                    />
                    <NotificationCard
                        id="high"
                        label="High & Critical Only"
                        icon={Zap}
                        colorClass="orange"
                        description="Only notify me for risk scores of 6 and above."
                    />
                    <NotificationCard
                        id="critical"
                        label="Critical Threats Only"
                        icon={MailWarning}
                        colorClass="red"
                        description="Only email me for absolute emergencies (Score 8+)."
                    />
                    <NotificationCard
                        id="none"
                        label="Do Not Disturb"
                        icon={BellOff}
                        colorClass="slate"
                        description="Turn off all email alerts. I'll check the dashboard."
                    />
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-600 transition-colors disabled:opacity-50 shadow-md"
                    >
                        <Save size={18} />
                        {saving ? "Saving Preferences..." : "Save Preferences"}
                    </button>
                </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <User size={20} className="text-slate-500" />
                    Session Management
                </h3>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                        <p className="font-bold text-slate-700">Signed in as</p>
                        <p className="text-sm text-slate-500">{auth.currentUser?.email}</p>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 bg-white text-red-600 border-2 border-red-100 px-6 py-3 rounded-xl font-bold hover:bg-red-50 hover:border-red-200 transition-all shadow-sm"
                    >
                        <LogOut size={18} />
                        Secure Sign Out
                    </button>
                </div>
            </div>

            <div className="bg-red-50 p-8 rounded-2xl shadow-sm border border-red-100">
                <h3 className="text-lg font-bold text-red-800 mb-2 flex items-center gap-2">
                    <AlertTriangle size={20} className="text-red-600" />
                    Danger Zone
                </h3>
                <p className="text-sm text-red-600 mb-6">
                    Once you delete your account, there is no going back. All of your personalized settings will be permanently erased.
                </p>

                <button
                    onClick={handleDeleteAccount}
                    className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-sm"
                >
                    Delete Account
                </button>
            </div>
        </div>
    );
}