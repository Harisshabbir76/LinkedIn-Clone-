import Image from "next/image";
import Link from "next/link";
import { 
  Briefcase, 
  Users, 
  Building2, 
  TrendingUp, 
  Search,
  ArrowRight,
  CheckCircle,
  Star,
  Clock,
  MapPin,
  Award,
  Shield
} from 'lucide-react';

export default function Home() {
  const stats = [
    { value: '10K+', label: 'Active Jobs' },
    { value: '5K+', label: 'Companies' },
    { value: '50K+', label: 'Job Seekers' },
    { value: '95%', label: 'Success Rate' }
  ];

  const features = [
    {
      icon: <Search className="w-6 h-6" />,
      title: 'Smart Job Search',
      description: 'AI-powered job matching that finds the perfect opportunities based on your skills and preferences.'
    },
    {
      icon: <Building2 className="w-6 h-6" />,
      title: 'Top Companies',
      description: 'Connect with leading companies from around the world, from startups to enterprise giants.'
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Network Building',
      description: 'Build professional relationships and expand your network within your industry.'
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: 'Career Growth',
      description: 'Access resources, courses, and mentorship opportunities to accelerate your career.'
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Software Engineer',
      company: 'TechCorp',
      image: '/testimonials/sarah.jpg',
      content: 'Found my dream job within 2 weeks! The platform\'s matching algorithm is incredibly accurate.',
      rating: 5
    },
    {
      name: 'Michael Chen',
      role: 'Product Manager',
      company: 'InnovateLabs',
      image: '/testimonials/michael.jpg',
      content: 'As an employer, we\'ve found exceptional talent through this platform. Highly recommended!',
      rating: 5
    },
    {
      name: 'Emily Rodriguez',
      role: 'UX Designer',
      company: 'CreativeStudio',
      image: '/testimonials/emily.jpg',
      content: 'The best job portal I\'ve used. Great interface and amazing opportunities.',
      rating: 5
    }
  ];

  const jobCategories = [
    { name: 'Technology', count: 2456, icon: '💻' },
    { name: 'Healthcare', count: 1234, icon: '🏥' },
    { name: 'Finance', count: 987, icon: '💰' },
    { name: 'Education', count: 654, icon: '📚' },
    { name: 'Marketing', count: 876, icon: '📱' },
    { name: 'Design', count: 543, icon: '🎨' }
  ];

  const howItWorks = [
    {
      step: '01',
      title: 'Create Profile',
      description: 'Sign up and build your professional profile with skills, experience, and preferences.'
    },
    {
      step: '02',
      title: 'Discover Jobs',
      description: 'Browse thousands of jobs or let our AI match you with the perfect opportunities.'
    },
    {
      step: '03',
      title: 'Apply & Connect',
      description: 'Apply with one click and connect directly with hiring managers.'
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 dark:bg-black/80 backdrop-blur-md z-50 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Image
                className="dark:invert"
                src="/next.svg"
                alt="JobPortal Logo"
                width={100}
                height={20}
                priority
              />
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/jobs" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition">
                Find Jobs
              </Link>
              <Link href="/companies" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition">
                Companies
              </Link>
              <Link href="/resources" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition">
                Resources
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <Link 
                href="/login" 
                className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition"
              >
                Sign In
              </Link>
              <Link 
                href="/register" 
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Join Now
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Find Your <span className="text-blue-600">Dream Job</span> Today
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
              Connect with top employers, discover opportunities, and take the next step in your career journey.
            </p>
            
            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Job title, keyword, or company"
                  className="w-full pl-12 pr-4 py-4 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                />
              </div>
              <button className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition font-semibold">
                Search Jobs
              </button>
            </div>

            {/* Popular Searches */}
            <div className="flex flex-wrap gap-2">
              <span className="text-gray-600 dark:text-gray-400">Popular:</span>
              {['Software Engineer', 'Product Manager', 'Data Scientist', 'UX Designer'].map((term) => (
                <Link
                  key={term}
                  href={`/jobs?search=${term}`}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full"
                >
                  {term}
                </Link>
              ))}
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative h-[500px] rounded-2xl overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600">
            <div className="absolute inset-0 bg-black/20"></div>
            <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
              <p className="text-2xl font-bold mb-2">"Found my dream job in 2 weeks!"</p>
              <p className="text-lg opacity-90">- Sarah Johnson, Software Engineer</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">{stat.value}</div>
              <div className="text-gray-600 dark:text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-4">
            Why Choose Our Platform
          </h2>
          <p className="text-xl text-center text-gray-600 dark:text-gray-400 mb-16 max-w-3xl mx-auto">
            We provide the tools and opportunities you need to advance your career
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="text-center">
                <div className="inline-flex p-4 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-4">
          How It Works
        </h2>
        <p className="text-xl text-center text-gray-600 dark:text-gray-400 mb-16">
          Three simple steps to your new career
        </p>

        <div className="grid md:grid-cols-3 gap-12">
          {howItWorks.map((item) => (
            <div key={item.step} className="relative">
              <div className="text-6xl font-bold text-blue-100 dark:text-blue-900/30 mb-4">
                {item.step}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {item.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Job Categories */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-4">
            Popular Categories
          </h2>
          <p className="text-xl text-center text-gray-600 dark:text-gray-400 mb-16">
            Explore jobs in your favorite field
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {jobCategories.map((category) => (
              <Link
                key={category.name}
                href={`/jobs?category=${category.name}`}
                className="group bg-white dark:bg-gray-800 p-6 rounded-xl text-center hover:shadow-lg transition"
              >
                <div className="text-4xl mb-3">{category.icon}</div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {category.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {category.count.toLocaleString()} jobs
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-4">
          What Our Users Say
        </h2>
        <p className="text-xl text-center text-gray-600 dark:text-gray-400 mb-16">
          Success stories from our community
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <div key={testimonial.name} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full mr-4"></div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {testimonial.name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {testimonial.role} at {testimonial.company}
                  </p>
                </div>
              </div>
              <div className="flex mb-3">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-600 dark:text-gray-400 italic">
                "{testimonial.content}"
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Ready to Start Your Journey?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of professionals who found their dream jobs through our platform
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition inline-flex items-center justify-center gap-2"
            >
              Create Free Account
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/jobs"
              className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white/10 transition"
            >
              Browse Jobs
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <Image
                className="brightness-0 invert mb-4"
                src="/next.svg"
                alt="JobPortal Logo"
                width={100}
                height={20}
              />
              <p className="text-gray-400 text-sm">
                Connecting talent with opportunity since 2024.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Job Seekers</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/jobs" className="hover:text-white transition">Browse Jobs</Link></li>
                <li><Link href="/companies" className="hover:text-white transition">Companies</Link></li>
                <li><Link href="/resources" className="hover:text-white transition">Career Resources</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Employers</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/post-job" className="hover:text-white transition">Post a Job</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition">Pricing</Link></li>
                <li><Link href="/solutions" className="hover:text-white transition">Enterprise Solutions</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about" className="hover:text-white transition">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-white transition">Contact</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400 text-sm">
            © 2024 JobPortal. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}