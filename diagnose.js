// Diagnostic script to help identify website issues
const fs = require('fs')
const path = require('path')

console.log('🔍 Octopus Diagnostic Tool')
console.log('='.repeat(50))

// Check critical files
const criticalFiles = [
  'app/page.tsx',
  'app/layout.tsx', 
  'components/BookingCodeInput.tsx',
  'lib/booking-slip-provider.ts',
  'lib/types.ts',
  'package.json',
  'next.config.js'
]

console.log('\n📁 Checking critical files:')
criticalFiles.forEach(file => {
  const exists = fs.existsSync(file)
  console.log(`${exists ? '✅' : '❌'} ${file}`)
})

// Check Next.js configuration
console.log('\n⚙️  Next.js configuration:')
try {
  const nextConfig = fs.readFileSync('next.config.js', 'utf8')
  console.log('✅ next.config.js readable')
  console.log('   Content preview:', nextConfig.substring(0, 100) + '...')
} catch (error) {
  console.log('❌ Error reading next.config.js:', error.message)
}

// Check main page component
console.log('\n📄 Main page component:')
try {
  const mainPage = fs.readFileSync('app/page.tsx', 'utf8')
  console.log('✅ app/page.tsx readable')
  console.log('   Lines:', mainPage.split('\n').length)
  console.log('   Contains BookingCodeInput:', mainPage.includes('BookingCodeInput'))
  console.log('   Contains export default:', mainPage.includes('export default'))
} catch (error) {
  console.log('❌ Error reading app/page.tsx:', error.message)
}

// Check for TypeScript errors in key files
console.log('\n🔍 Checking for obvious syntax issues:')
const tsFiles = [
  'lib/booking-slip-provider.ts',
  'app/api/analyze/route.ts',
  'app/page.tsx'
]

tsFiles.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8')
    const hasBrackets = (content.match(/\{/g) || []).length === (content.match(/\}/g) || []).length
    console.log(`${hasBrackets ? '✅' : '⚠️'} ${file} - brackets balanced`)
  } catch (error) {
    console.log(`❌ ${file} - ${error.message}`)
  }
})

console.log('\n💡 Recommendations:')
console.log('1. Make sure Node.js is installed and in PATH')
console.log('2. Run: npm install (to ensure dependencies are installed)')
console.log('3. Run: npm run dev (to start development server)')
console.log('4. Check browser console for any JavaScript errors')
console.log('5. Check terminal for any build errors')

console.log('\n' + '='.repeat(50))
console.log('🔍 Diagnostic Complete!')
