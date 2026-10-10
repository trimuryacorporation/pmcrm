import { Link } from 'react-router-dom';
export default function BrandLogo({className='',linked=false}) {
  const image=<img src="/branding/trimurya-logo.svg" alt="Trimurya Corporation — Create, Preserve, Transform" width="1600" height="470" className={'block h-auto w-full object-contain '+className}/>;
  return linked?<Link to="/dashboard" aria-label="Trimurya Corporation dashboard">{image}</Link>:image;
}
