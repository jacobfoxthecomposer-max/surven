"use client";

import React from "react";

const images = [
  "https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=1974&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1472396961693-142e6e269027?q=80&w=2152&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1505142468610-359e7d316be0?q=80&w=2126&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1482881497185-d4a9ddbe4151?q=80&w=1965&auto=format&fit=crop",
  "https://plus.unsplash.com/premium_photo-1673264933212-d78737f38e48?q=80&w=1974&auto=format&fit=crop",
  "https://plus.unsplash.com/premium_photo-1711434824963-ca894373272e?q=80&w=2030&auto=format&fit=crop",
  "https://plus.unsplash.com/premium_photo-1675705721263-0bbeec261c49?q=80&w=1940&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1524799526615-766a9833dec0?q=80&w=1935&auto=format&fit=crop",
  // Additional images
  "https://images.unsplash.com/photo-1501854140801-50d01698950b?q=80&w=1960&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1974&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=1974&auto=format&fit=crop",
];

const duplicated = [...images, ...images];

export function ImageAutoSlider() {
  return (
    <>
      <style>{`
        @keyframes slider-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .slider-track {
          animation: slider-scroll 30s linear infinite;
        }
        .slider-wrapper:hover .slider-track {
          animation-play-state: paused;
        }
        .slider-mask {
          mask: linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%);
          -webkit-mask: linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%);
        }
        .slider-image {
          transition: transform 0.35s ease, filter 0.35s ease, box-shadow 0.35s ease;
        }
        .slider-image:hover {
          transform: scale(1.08);
          filter: brightness(1.15);
          box-shadow: 0 0 32px 4px rgb(67 97 238 / 0.35);
          z-index: 10;
        }
      `}</style>

      <div className="slider-wrapper w-full overflow-hidden py-4">
        <div className="slider-mask w-full">
          <div className="slider-track flex gap-5 w-max">
            {duplicated.map((src, i) => (
              <div
                key={i}
                className="slider-image relative flex-shrink-0 w-52 h-52 md:w-64 md:h-64 lg:w-72 lg:h-72 rounded-2xl overflow-hidden border border-[#334155] shadow-xl"
                style={{ position: "relative" }}
              >
                <img
                  src={src}
                  alt={`Slide ${(i % images.length) + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* Subtle inner tint to match dark theme */}
                <div className="absolute inset-0 bg-[#0f172a]/20 pointer-events-none" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
