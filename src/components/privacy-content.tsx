import { tools } from "@/lib/tools";
import { PrivacyPill } from "@/components/privacy-pill";

export function FactStrip() {
  return (
    <div className="fact-strip">
      <div><strong>0 bytes</strong><span>of your files sent to servers</span></div>
      <div><strong>On your device</strong><span>browser processing · internet required</span></div>
      <div><strong>Free</strong><span>no account, no sign-up</span></div>
    </div>
  );
}

export function PrivacyBand() {
  return (
    <section id="privacy" className="privacy-band">
      <div className="container">
        <PrivacyPill>Files stay on this device</PrivacyPill>
        <h2>The work happens in your browser,<br className="desktop-break" /> not on a server.</h2>
        <div className="privacy-steps">
          <div><span className="step-number">01</span><h3>Open a file</h3>
            <p>Pick or drop a PDF. Your browser reads it directly from your device.</p></div>
          <div><span className="step-number">02</span><h3>Process locally</h3>
            <p>Edit PDF pages using your own device. No file uploads.</p></div>
          <div><span className="step-number">03</span><h3>Save the result</h3>
            <p>Download your new PDF files. Nothing from your documents is sent to a server.</p></div>
        </div>
      </div>
    </section>
  );
}

const questions = [
  ["Are my files uploaded anywhere?",
    "No. Your files and page previews stay in your browser. The available tools process PDFs on your device, "
    + "and you download the results directly."],
  ["Does it work offline?",
    "Not yet. You need an internet connection to load the app and its processing and preview assets. "
    + "Browser-only processing does not mean offline support."],
  ["Which tools can I use today?",
    `The available tools are ${tools.filter((tool) => tool.available).map((tool) => tool.name).join(", ")}. `
    + `The other ${tools.filter((tool) => !tool.available).length} tools are marked Coming soon. `
    + "Their pages support PDF previews, but cannot create a result yet."],
  ["Is it free?", "Yes. The available tools are free to use. No account or sign-up is needed."],
  ["Is there a file size limit?",
    "Your device's memory limits what it can handle. Very large PDFs may take longer or fail; "
    + "try smaller files or fewer pages if that happens."],
];

export function Faq() {
  return (
    <section className="faq container section-space" aria-labelledby="faq-title">
      <div><p className="eyebrow">A FEW THINGS TO KNOW</p><h2 id="faq-title">Questions, answered.</h2></div>
      <div className="faq-rows">{questions.map(([question, answer]) => (
        <details key={question}><summary>{question}<span aria-hidden="true" /></summary><p>{answer}</p></details>
      ))}</div>
    </section>
  );
}
