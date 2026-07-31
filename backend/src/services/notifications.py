import smtplib, os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_consolidated_email(target_email, incidents):
    """Sends a single email containing multiple incident reports."""
    sender = os.getenv("EMAIL_USER")
    password = os.getenv("EMAIL_PASS")

    if not sender or not password or not incidents:
        return

    msg = MIMEMultipart()
    msg['From'] = sender
    msg['To'] = target_email
    msg['Subject'] = f"🚨 SOC Batch Alert: {len(incidents)} Incidents Detected"

    # Create a clean HTML table for the incidents
    rows = ""
    for inc in incidents:
        # Determine color for risk score
        color = "#ef4444" if inc['risk_score'] >= 8 else "#f97316" if inc['risk_score'] >= 6 else "#22c55e"
        
        rows += f"""
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-family: monospace;">#{inc['event_id']}</td>
            <td style="padding: 10px; font-weight: bold; color: {color};">{inc['risk_score']}/10</td>
            <td style="padding: 10px;">{inc['summary']}</td>
        </tr>
        """

    body = f"""
    <div style="font-family: sans-serif; max-width: 600px;">
        <h2 style="color: #1e293b;">Security Incident Report</h2>
        <p style="color: #64748b;">A new batch of suspicious activity has been analyzed.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead style="background-color: #f8fafc; text-align: left;">
                <tr>
                    <th style="padding: 10px;">ID</th>
                    <th style="padding: 10px;">Risk</th>
                    <th style="padding: 10px;">AI Summary</th>
                </tr>
            </thead>
            <tbody>
                {rows}
            </tbody>
        </table>
        
        <br>
        <a href="http://localhost:5173" 
           style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
           Open Investigation Dashboard
        </a>
    </div>
    """
    
    msg.attach(MIMEText(body, 'html'))

    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(sender, password)
            server.send_message(msg)
            print(f"Consolidated alert sent to {target_email}")
    except Exception as e:
        print(f"Mail Error: {e}")