import { useState, useEffect } from "react";
import { Save, Shield, Briefcase, Wrench, LogOut, User, AlertTriangle, Bell, BellOff, MailWarning, Zap, Layout, BellRing } from "lucide-react";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { signOut, deleteUser } from "firebase/auth";

// main settings component for managing user preferences
export default function Settings() {
    // state for user configuration options
    const [techLevel, setTechLevel] = useState("business_owner");
    const [notificationLevel, setNotificationLevel] = useState("critical");
    const [appNotificationLevel, setAppNotificationLevel] = useState("high");
    const [saving, setSaving] = useState(false);

    // load existing user preferences from firestore on mount
    useEffect(() => {
        const fetchSettings = async () => {
            const user = auth.currentUser;
            if (!user) return;

            try {
                // fetch the specific document matching the authenticated user's uid
                const docRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.tech_level) setTechLevel(data.tech_level);
                    if (data.notification_level) setNotificationLevel(data.notification_level);
                    if (data.app_notification_level) setAppNotificationLevel(data.app_notification_level);
                }
            } catch (err) {
                console.error("failed to load settings:", err);
            }
        };
        fetchSettings();
    }, []);

    // handle pushing updated preferences back to the database
    const handleSave = async () => {
        const user = auth.currentUser;
        if (!user) {
            alert("authentication error: no user logged in.");
            return;
        }

        setSaving(true);
        try {
            // merge true ensures we only update these specific fields without overwriting other user data
            await setDoc(doc(db, "users", user.uid), {
                tech_level: techLevel,
                notification_level: notificationLevel,
                app_notification_level: appNotificationLevel
            }, { merge: true });

            alert("account preferences updated successfully!");
        } catch (e) {
            console.error(e);
            alert("error saving settings");
        }
        setSaving(false);
    };

    // securely log the user out
    const handleLogout = async () => {
        try {
            await signOut(auth);
            // reload forces the app to reset state and kick them back to the login screen
            window.location.reload();
        } catch (error) {
            console.error("error signing out:", error);
            alert("failed to sign out. please try again.");
        }
    };

    // permanently delete the user account and associated data
    const handleDeleteAccount = async () => {
        const user = auth.currentUser;
        if (!user) return;

        const confirmDelete = window.confirm(
            "are you absolutely sure you want to delete your account? this action cannot be undone and will erase all your preferences."
        );

        if (confirmDelete) {
            try {
                // first delete their custom data document in firestore
                await deleteDoc(doc(db, "users", user.uid));
                // then delete their actual authentication profile
                await deleteUser(user);
                alert("your account has been successfully deleted.");
                window.location.reload();
            } catch (error: any) {
                console.error("error deleting account:", error);
                // firebase requires a fresh token for destructive actions
                if (error.code === 'auth/requires-recent-login') {
                    alert("for security reasons, please log out and log back in before deleting your account.");
                } else {
                    alert("failed to delete account. please try again.");
                }
            }
        }
    };

    // reusable component for selecting ai personality tiers
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

    // reusable component for selecting notification thresholds
    const NotificationCard = ({ id, label, icon: Icon, description, colorClass, selectedValue, onSelect }: any) => (
        <div
            onClick={() => onSelect(id)}
            className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${selectedValue === id
                ? `border-${colorClass}-500 bg-${colorClass}-50`
                : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
        >
            <div className={`p-2 rounded-lg ${selectedValue === id ? `bg-${colorClass}-500 text-white` : "bg-slate-100 text-slate-500"}`}>
                <Icon size={20} />
            </div>
            <div>
                <h3 className={`font-bold text-sm ${selectedValue === id ? `text-${colorClass}-900` : "text-slate-700"}`}>{label}</h3>
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
                    <LevelCard id="business_owner" label="Business Owner" icon={Briefcase} description="plain english. focuses on risk, business impact, and whether you need to call an expert." />
                    <LevelCard id="it_support" label="IT Support" icon={Wrench} description="action-oriented. suggests standard fixes, firewall rules, and password resets." />
                    <LevelCard id="soc_analyst" label="SOC Analyst" icon={Shield} description="deep technical dive. analyzes raw payloads, attack vectors, and iocs." />
                </div>

                {/* email notifications configuration */}
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
                        description="get an email for every single security event."
                        selectedValue={notificationLevel}
                        onSelect={setNotificationLevel}
                    />
                    <NotificationCard
                        id="high"
                        label="High & Critical Only"
                        icon={Zap}
                        colorClass="orange"
                        description="only notify me for risk scores of 6 and above."
                        selectedValue={notificationLevel}
                        onSelect={setNotificationLevel}
                    />
                    <NotificationCard
                        id="critical"
                        label="Critical Threats Only"
                        icon={MailWarning}
                        colorClass="red"
                        description="only email me for absolute emergencies (score 8+)."
                        selectedValue={notificationLevel}
                        onSelect={setNotificationLevel}
                    />
                    <NotificationCard
                        id="none"
                        label="Do Not Disturb"
                        icon={BellOff}
                        colorClass="slate"
                        description="turn off all email alerts. i'll check the dashboard."
                        selectedValue={notificationLevel}
                        onSelect={setNotificationLevel}
                    />
                </div>

                {/* in-app notifications configuration */}
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 pt-6 border-t border-slate-100">
                    <Layout size={20} className="text-indigo-500" />
                    In-App Dashboard Alerts
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <NotificationCard
                        id="medium"
                        label="Medium & Above"
                        icon={BellRing}
                        colorClass="yellow"
                        description="show banners for medium, high, and critical alerts."
                        selectedValue={appNotificationLevel}
                        onSelect={setAppNotificationLevel}
                    />
                    <NotificationCard
                        id="high"
                        label="High & Critical Only"
                        icon={Zap}
                        colorClass="orange"
                        description="show banners for risk scores of 6 and above."
                        selectedValue={appNotificationLevel}
                        onSelect={setAppNotificationLevel}
                    />
                    <NotificationCard
                        id="critical"
                        label="Critical Only"
                        icon={AlertTriangle}
                        colorClass="red"
                        description="only show top banners for absolute emergencies."
                        selectedValue={appNotificationLevel}
                        onSelect={setAppNotificationLevel}
                    />
                    <NotificationCard
                        id="none"
                        label="Disabled"
                        icon={BellOff}
                        colorClass="slate"
                        description="hide all pop-up banners. i'll check the table."
                        selectedValue={appNotificationLevel}
                        onSelect={setAppNotificationLevel}
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