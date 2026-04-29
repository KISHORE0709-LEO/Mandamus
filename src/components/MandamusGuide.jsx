import React, { useState, useEffect } from 'react';
import Spline from '@splinetool/react-spline';
import './MandamusGuide.css';

const guideMessages = {
  summariser: {
    title: "NEURAL_SUMMARISER",
    text: "Welcome! Upload your case PDF here. My neural engine will distill it into a structured brief in under 60 seconds. Efficiency is justice.",
    next: "Once summarized, we'll find matching precedents."
  },
  precedent: {
    title: "PRECEDENT_FINDER",
    text: "Enter your query to scan lakhs of judgments. I'll find the Top 5 matches with semantic similarity scores for your strategy.",
    next: "Select cases to use them in your final draft."
  },
  draft: {
    title: "DRAFT_GENERATOR",
    text: "Here you build the legal document. I've enabled Forensic Versioning—every edit you make is tracked and restorable in the history enclave.",
    next: "Approve the draft to unlock the hearing scheduler."
  },
  scheduler: {
    title: "SMART_SCHEDULER",
    text: "Awaiting approval? Once approved, pick a slot. My engine ensures hearings only happen when all parties are technically ready.",
    next: "Final step: The Virtual Hearing Enclave."
  },
  virtual: {
    title: "VIRTUAL_HEARING",
    text: "Digital Courtroom active. System check: AES-256 encryption secure. Biometric verification initialized. Good luck with the session.",
    next: "The full judicial pipeline is now under your control."
  }
};

const MandamusGuide = ({ activeFeature }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState(guideMessages.summariser);

  useEffect(() => {
    // Proactive guidance on tab change
    if (guideMessages[activeFeature]) {
      setMessage(guideMessages[activeFeature]);
      setIsVisible(true);
      
      // Auto-hide bubble after 8 seconds of inactivity
      const timer = setTimeout(() => setIsVisible(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [activeFeature]);

  return (
    <div className="mandamus-guide-container">
      {isVisible && (
        <div className="guide-bubble">
          <div className="guide-header">
            <span className="guide-title">{message.title}</span>
            <button className="guide-close" onClick={() => setIsVisible(false)}>×</button>
          </div>
          <p className="guide-text">{message.text}</p>
          <div className="guide-footer">
            <span className="guide-hint">NEXT: {message.next}</span>
          </div>
        </div>
      )}
      
      <div className="robot-wrapper" onClick={() => setIsVisible(!isVisible)}>
        <Spline 
          scene="https://prod.spline.design/rU2-Ks0SC0T5od9B/scene.splinecode" 
          onLoad={() => console.log('Robot Guide Initialized')}
        />
      </div>
    </div>
  );
};

export default MandamusGuide;
