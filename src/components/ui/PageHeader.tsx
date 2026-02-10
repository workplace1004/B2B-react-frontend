import Breadcrumb from '../Breadcrumb';

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbPage: string;
  className?: string;
}

export default function PageHeader({ 
  title, 
  description, 
  breadcrumbPage,
  className = '' 
}: PageHeaderProps) {
  return (
    <div className={className}>
      <Breadcrumb currentPage={breadcrumbPage} />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">{title}</h1>
            {description && (
              <p className="text-gray-500 dark:text-gray-400 mt-1 text-[14px]">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}





