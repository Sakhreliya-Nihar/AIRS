****Project Title****

### A.I.R.S: An AI-Driven Incident Response Dashboard for SMEs

****Keywords****

Cybersecurity | Small and Medium-sized Enterprises (SMEs) | Incident Response | Large Language Models (LLMs) | Risk Management | Threat Mitigation | Artificial Intelligence | React | Security Dashboard

****Project Description****

Small and medium-sized enterprises (SMEs) are facing an increase in targeted cyberattacks but often lack the resources, expertise and awareness to respond to incidents effectively. The financial pressures brought on by the COVID-19 pandemic has forced many SMEs to prioritise the short-term business survival over the long-term cybersecurity investment. As a result, numerous SMEs are continuing to use outdated systems and are providing limited staff training, with many of them assuming that they are too small to be targeted – a misconception that has left them highly vulnerable. 

Furthermore, while some SMEs utilise open-source or commercial detection tools, they struggle to interpret the complex, technical alerts these systems generate. This "technical noise" leads to delayed responses, poor incident communication, and greater financial and reputational damage. According to a 2025 Hiscox report, 59% of SMEs experienced a cyber-attack in the last 12 months, highlighting the urgent need for accessible cybersecurity support.     
 
### The A.I.R.S. Solution  

This project addresses these challenges through the development of A.I.R.S., an affordable, AI-driven incident response dashboard designed specifically for SMEs. A.I.R.S. bridges the cybersecurity expertise gap by integrating standard open-source detection tools with modern cloud infrastructure, utilising Google Firestore and the Gemini 2.5 Flash API.

To ensure strict data privacy and address the security concerns of cloud integration, the system employs a strict two-tier security pipeline. First, raw network and system logs undergo local regex sanitisation to strip Personally Identifiable Information (PII) prior to LLM analysis, ensuring no sensitive data is processed by the AI. Subsequently, all incident records and AI summaries are secured via Fernet AES encryption before being transmitted to the cloud database. 

### Core Functionality and Impact

Unlike expensive, enterprise-level AI Security Operations Centre (SOC) products, A.I.R.S. provides a low-cost, intuitive React-based dashboard tailored for non-technical users. The system dynamically translates complex security alerts into plain-English summaries, calculates clear risk scores (1–10), and generates step-by-step mitigation playbooks. 

Key features include dynamic AI personas that adjust the technical depth of the response based on the user's role, providing targeted LLM summaries complete with actionable mitigation steps. A.I.R.S. also features automated email notifications for new events, ensuring threats are addressed promptly. Ultimately, A.I.R.S. serves both an operational and educational role—helping SME owners understand what happened, how serious it is, and exactly how to fix it, thereby strengthening their overall organisational cyber resilience.

****Supervisor****

Ushoshee Mukherjee

****Sources:****
https://www.hiscoxgroup.com/news/press-releases/2025/29-09-25 

