// components/company/LogoAndCover.tsx
import { Image } from 'react-bootstrap';
import { FaBuilding } from 'react-icons/fa';

interface LogoAndCoverProps {
  company: any;
  logoError: boolean;
  coverError: boolean;
  getImageUrl: (imagePath: string | undefined | null) => string;
  setLogoError: (error: boolean) => void;
  setCoverError: (error: boolean) => void;
  canEdit?: boolean;
  onEditClick?: () => void;
}

export default function LogoAndCover({
  company,
  logoError,
  coverError,
  getImageUrl,
  setLogoError,
  setCoverError,
  canEdit,
  onEditClick
}: LogoAndCoverProps) {
  return (
    <div className="position-relative" style={{ height: '300px' }}>
      {/* Cover Image */}
      <div className="w-100 h-100 position-relative">
        {company.coverImage && !coverError ? (
          <img
            src={getImageUrl(company.coverImage)}
            alt={`${company.name} cover`}
            className="w-100 h-100 object-fit-cover"
            style={{ 
              borderRadius: '0 0 8px 8px',
              objectPosition: 'center'
            }}
            onError={() => {
              console.error('Cover image failed to load:', getImageUrl(company.coverImage));
              setCoverError(true);
            }}
            onLoad={() => console.log('Cover image loaded successfully')}
          />
        ) : (
          <div 
            className="w-100 h-100"
            style={{ 
              background: 'linear-gradient(135deg, #0a66c2 0%, #004182 100%)',
              borderRadius: '0 0 8px 8px'
            }}
          >
            <div className="w-100 h-100 d-flex align-items-center justify-content-center">
              <span className="text-white opacity-75">No cover image</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Profile Image Container */}
      <div className="position-absolute" style={{ bottom: '-40px', left: '40px' }}>
        <div className="position-relative">
          {/* Profile Image Circle */}
          <div 
            className="border-5 border-white rounded-circle shadow-lg"
            style={{ 
              width: '160px', 
              height: '160px',
              overflow: 'hidden',
              backgroundColor: '#f8f9fa'
            }}
          >
            {company.logo && !logoError ? (
              <img 
                src={getImageUrl(company.logo)} 
                alt={`${company.name} logo`}
                className="w-100 h-100 object-fit-cover"
                onError={() => {
                  console.error('Logo failed to load:', getImageUrl(company.logo));
                  setLogoError(true);
                }}
                onLoad={() => console.log('Logo loaded successfully')}
              />
            ) : (
              <div className="w-100 h-100 rounded-circle bg-primary d-flex align-items-center justify-content-center">
                <FaBuilding size={60} className="text-white" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}