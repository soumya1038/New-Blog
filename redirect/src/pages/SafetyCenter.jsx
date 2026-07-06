import React from 'react';
import { Link } from 'react-router-dom';
import {
  FaBan,
  FaExclamationTriangle,
  FaFileAlt,
  FaFlag,
  FaShieldAlt,
} from 'react-icons/fa';
import './HelpCenter.css';

const SafetyCenter = () => (
  <main className="help-page">
    <section className="help-hero">
      <div className="help-shell py-10 sm:py-14">
        <div className="mb-4 flex items-center gap-3 text-[var(--help-link-color)]">
          <FaShieldAlt aria-hidden="true" />
          <span className="text-sm font-extrabold">Lekhon Safety Center</span>
        </div>
        <h1 className="m-0 max-w-3xl text-3xl font-black leading-tight sm:text-4xl">
          Protect yourself, preserve evidence, and tell us what happened.
        </h1>
        <p className="mb-0 mt-3 max-w-3xl text-base leading-7 text-[var(--text-secondary)]">
          Use these steps for abusive content, harassment, impersonation,
          account compromise, unsafe messages, marketplace fraud, or illegal
          activity.
        </p>
      </div>
    </section>

    <div className="help-shell py-10 sm:py-12">
      <section className="help-action-band" aria-label="Safety actions">
        <Link to="/report">
          <FaFlag className="mb-3 text-xl text-[var(--help-link-color)]" />
          <h2 className="m-0 text-base font-black">Report abuse or fraud</h2>
          <p className="mb-0 mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Submit the content, account, message, product, review, or order details.
          </p>
        </Link>
        <Link to="/help/article/block-or-mute-a-user">
          <FaBan className="mb-3 text-xl text-[var(--help-link-color)]" />
          <h2 className="m-0 text-base font-black">Block or mute</h2>
          <p className="mb-0 mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Stop new messages or silence conversation notifications.
          </p>
        </Link>
        <Link to="/appeals">
          <FaFileAlt className="mb-3 text-xl text-[var(--help-link-color)]" />
          <h2 className="m-0 text-base font-black">Submit an appeal</h2>
          <p className="mb-0 mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Ask for review of a warning, suspension, removal, or seller action.
          </p>
        </Link>
      </section>

      <section className="pt-12">
        <h2 className="m-0 text-2xl font-black">What to do now</h2>
        <div className="help-article-body mt-3">
          <section>
            <h2>1. Move to safety</h2>
            <p>
              If there is an immediate threat of physical harm, contact local
              emergency services. Lekhon support is not an emergency response
              service.
            </p>
          </section>
          <section>
            <h2>2. Preserve useful evidence</h2>
            <ul>
              <li>Record the username, URL, product, order number, group, or conversation.</li>
              <li>Capture the relevant date, time, and screenshots.</li>
              <li>Do not publish private evidence publicly.</li>
              <li>Keep payment references for suspected marketplace fraud.</li>
            </ul>
          </section>
          <section>
            <h2>3. Block or stop interacting</h2>
            <p>
              Use Block in Chat when a user should no longer message you. Do
              not continue a threatening conversation merely to collect more
              evidence.
            </p>
          </section>
          <section>
            <h2>4. Report the correct object</h2>
            <p>
              Select the closest report category and provide direct links or
              identifiers. Clear, specific reports are easier to review than
              broad descriptions without evidence.
            </p>
          </section>
        </div>
      </section>

      <div className="help-callout help-callout--warning mt-10">
        <FaExclamationTriangle className="mr-2 inline" aria-hidden="true" />
        Lekhon is building more report controls directly into content,
        profiles, reviews, products, and conversations. Until those controls
        are available everywhere, use the central report form.
      </div>
    </div>
  </main>
);

export default SafetyCenter;

