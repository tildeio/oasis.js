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
    sh "git checkout 2.0.0"
    Bundler.with_clean_env do
      sh "bundle"
      sh "npm install"
      sh "bundle exec rake dist"
    end
  end
end

file "lib/rsvp.js" => :update_rsvp do
  rsvp_with_loader = File.read("tmp/rsvp.js/browser/rsvp.js")
  File.open('lib/rsvp.amd.js', 'w') do |rsvp|
    # Strip out the loader; later rsvp will likely build this for us
    start_ix = rsvp_with_loader =~ /^define\("rsvp\/all/
    end_ix = rsvp_with_loader =~ /\nwindow\.RSVP/
    rsvp.print rsvp_with_loader[start_ix..end_ix]
  end
end

task :rakep => "lib/rsvp.js" do
  sh "rakep build"
end

desc "Build browser and AMD versions of Oasis.js"
task :build => :rakep
task :default => :build
