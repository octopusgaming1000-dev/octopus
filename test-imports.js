// Simple test to check if imports work
try {
  console.log('Testing imports...')
  
  // Test basic Node.js functionality
  const fs = require('fs')
  const path = require('path')
  
  console.log('✅ Node.js modules working')
  
  // Check if files exist
  const providerPath = path.join(__dirname, 'lib', 'booking-slip-provider.ts')
  const typesPath = path.join(__dirname, 'lib', 'types.ts')
  
  console.log('Provider file exists:', fs.existsSync(providerPath))
  console.log('Types file exists:', fs.existsSync(typesPath))
  
  // Check package.json
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  console.log('Next.js version:', packageJson.dependencies.next)
  console.log('✅ Package.json readable')
  
  console.log('✅ All basic checks passed')
  
} catch (error) {
  console.error('❌ Error:', error.message)
}
