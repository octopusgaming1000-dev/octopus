interface OctopusLogoProps {
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export default function OctopusLogo({ size = 'medium', className = '' }: OctopusLogoProps) {
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-16 h-16'
  }

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Octopus head */}
        <circle
          cx="50"
          cy="35"
          r="20"
          fill="url(#gradient)"
          className="animate-pulse"
        />
        
        {/* Octopus eyes */}
        <circle cx="42" cy="32" r="3" fill="white" />
        <circle cx="58" cy="32" r="3" fill="white" />
        <circle cx="42" cy="32" r="1.5" fill="#1a1a1a" />
        <circle cx="58" cy="32" r="1.5" fill="#1a1a1a" />
        
        {/* Octopus tentacles */}
        <path
          d="M 30 45 Q 25 60 20 65 Q 15 70 10 75"
          stroke="url(#gradient)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          className="animate-bounce"
        />
        <path
          d="M 35 45 Q 30 60 25 65 Q 20 70 15 75"
          stroke="url(#gradient)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          className="animate-bounce"
          style={{ animationDelay: '0.2s' }}
        />
        <path
          d="M 40 45 Q 35 60 30 65 Q 25 70 20 75"
          stroke="url(#gradient)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          className="animate-bounce"
          style={{ animationDelay: '0.4s' }}
        />
        <path
          d="M 45 45 Q 40 60 35 65 Q 30 70 25 75"
          stroke="url(#gradient)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          className="animate-bounce"
          style={{ animationDelay: '0.6s' }}
        />
        <path
          d="M 50 45 Q 45 60 40 65 Q 35 70 30 75"
          stroke="url(#gradient)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          className="animate-bounce"
          style={{ animationDelay: '0.8s' }}
        />
        <path
          d="M 55 45 Q 50 60 45 65 Q 40 70 35 75"
          stroke="url(#gradient)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          className="animate-bounce"
          style={{ animationDelay: '1s' }}
        />
        <path
          d="M 60 45 Q 55 60 50 65 Q 45 70 40 75"
          stroke="url(#gradient)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          className="animate-bounce"
          style={{ animationDelay: '1.2s' }}
        />
        <path
          d="M 65 45 Q 60 60 55 65 Q 50 70 45 75"
          stroke="url(#gradient)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          className="animate-bounce"
          style={{ animationDelay: '1.4s' }}
        />
        <path
          d="M 70 45 Q 65 60 60 65 Q 55 70 50 75"
          stroke="url(#gradient)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          className="animate-bounce"
          style={{ animationDelay: '1.6s' }}
        />
        
        {/* Gradient definition */}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#667eea" />
            <stop offset="100%" stopColor="#764ba2" />
          </linearGradient>
        </defs>
        
        {/* Subtle animation styles */}
        <style jsx>{`
          @keyframes bounce {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-3px); }
          }
          
          .animate-bounce {
            animation: bounce 3s ease-in-out infinite;
            transform-origin: top center;
          }
          
          .animate-pulse {
            animation: pulse 2s ease-in-out infinite;
          }
          
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
          }
        `}</style>
      </svg>
    </div>
  )
}
