directory "tmp"

file "tmp/rsvp.js" => "tmp" do
  cd "tmp" do
    sh "git clone https://github.com/tildeio/rsvp.js.git"
  end
end

desc "Update the rsvp.js dependency from GitHub master"
task :update_rsvp => ["tmp/rsvp.js"] do
  cd "tmp/rsvp.js" do
    sh "git fetch origin"
    sh "git reset --hard origin/master"
    sh "bundle"
    Bundler.with_clean_env { sh "bundle exec rake dist" }
  end
end

file "lib/rsvp.js" => :update_rsvp do
  cp "tmp/rsvp.js/browser/rsvp.amd.js", "lib/rsvp.amd.js"
end

task :rakep => "lib/rsvp.js" do
  sh "rakep build"
end

desc "Build browser and AMD versions of Oasis.js"
task :build => :rakep
task :default => :build
